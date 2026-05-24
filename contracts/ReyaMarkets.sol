// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReyaMarkets
 * @notice Prediction market betting contract on Reya Network
 * @dev Uses rUSD as collateral, syncs markets from Polymarket (crypto only)
 *      Relayer resolves markets based on Polymarket outcomes
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract ReyaMarkets {

    // ─── State ───────────────────────────────────────────────────────────────

    address public owner;
    address public relayer;          // backend that resolves markets
    IERC20  public rUSD;             // rUSD token on Reya Network
    uint256 public feeBps = 100;     // 1% = 100 basis points
    uint256 public collectedFees;

    uint256 private _marketCounter;

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Market {
        string  polymarketId;        // Polymarket condition ID
        string  question;            // e.g. "Will BTC exceed $100k?"
        string  category;            // e.g. "crypto"
        uint256 endTime;             // Unix timestamp
        bool    resolved;
        bool    cancelled;
        uint8   winningOutcome;      // 0 = YES, 1 = NO (or index for multi)
        uint256 totalPool;           // total rUSD in pool
        uint256[] outcomePools;      // rUSD per outcome
        string[] outcomeLabels;      // ["YES","NO"] or multi
        uint256 createdAt;
    }

    struct Bet {
        address user;
        uint256 marketId;
        uint8   outcome;
        uint256 amount;              // rUSD amount
        bool    claimed;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public marketBets;       // marketId → bets
    mapping(address => uint256[]) public userBetIds;   // user → bet indices
    mapping(uint256 => mapping(address => uint256[])) public userMarketBetIndices;
    mapping(string => bool) public polymarketIdExists; // prevent duplicates

    // ─── Events ───────────────────────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        string polymarketId,
        string question,
        uint256 endTime
    );
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        uint8 outcome,
        uint256 amount
    );
    event MarketResolved(
        uint256 indexed marketId,
        uint8 winningOutcome
    );
    event MarketCancelled(uint256 indexed marketId);
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );
    event FeesWithdrawn(address to, uint256 amount);
    event RelayerUpdated(address newRelayer);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRelayerOrOwner() {
        require(
            msg.sender == relayer || msg.sender == owner,
            "Not relayer or owner"
        );
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < _marketCounter, "Market not found");
        _;
    }

    modifier notResolved(uint256 marketId) {
        require(!markets[marketId].resolved, "Already resolved");
        require(!markets[marketId].cancelled, "Market cancelled");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _rUSD, address _relayer) {
        owner   = msg.sender;
        rUSD    = IERC20(_rUSD);
        relayer = _relayer;
    }

    // ─── Market Management ────────────────────────────────────────────────────

    /**
     * @notice Create a new prediction market synced from Polymarket
     * @param polymarketId  Polymarket condition ID (unique)
     * @param question      Market question text
     * @param category      Market category (must be "crypto")
     * @param endTime       Resolution deadline (unix timestamp)
     * @param outcomeLabels Array of outcome strings e.g. ["YES","NO"]
     */
    function createMarket(
        string calldata polymarketId,
        string calldata question,
        string calldata category,
        uint256 endTime,
        string[] calldata outcomeLabels
    ) external onlyRelayerOrOwner returns (uint256 marketId) {
        require(!polymarketIdExists[polymarketId], "Market already exists");
        require(outcomeLabels.length >= 2, "Need at least 2 outcomes");
        require(outcomeLabels.length <= 8, "Max 8 outcomes");
        require(endTime > block.timestamp, "End time in past");

        marketId = _marketCounter++;
        polymarketIdExists[polymarketId] = true;

        uint256[] memory pools = new uint256[](outcomeLabels.length);

        markets[marketId] = Market({
            polymarketId:   polymarketId,
            question:       question,
            category:       category,
            endTime:        endTime,
            resolved:       false,
            cancelled:      false,
            winningOutcome: 0,
            totalPool:      0,
            outcomePools:   pools,
            outcomeLabels:  outcomeLabels,
            createdAt:      block.timestamp
        });

        emit MarketCreated(marketId, polymarketId, question, endTime);
    }

    // ─── Betting ──────────────────────────────────────────────────────────────

    /**
     * @notice Place a bet on a market outcome using rUSD
     * @param marketId  ID of the market
     * @param outcome   Index of the outcome (0 = first, 1 = second, etc.)
     * @param amount    Amount of rUSD to bet (18 decimals)
     */
    function placeBet(
        uint256 marketId,
        uint8   outcome,
        uint256 amount
    ) external marketExists(marketId) notResolved(marketId) {
        Market storage m = markets[marketId];

        require(block.timestamp < m.endTime, "Market closed");
        require(outcome < m.outcomeLabels.length, "Invalid outcome");
        require(amount > 0, "Amount must be > 0");

        // transfer rUSD from user to contract
        bool ok = rUSD.transferFrom(msg.sender, address(this), amount);
        require(ok, "rUSD transfer failed");

        // record bet
        uint256 betIndex = marketBets[marketId].length;
        marketBets[marketId].push(Bet({
            user:    msg.sender,
            marketId: marketId,
            outcome: outcome,
            amount:  amount,
            claimed: false
        }));

        userMarketBetIndices[marketId][msg.sender].push(betIndex);
        userBetIds[msg.sender].push(marketId);

        // update pools
        m.outcomePools[outcome] += amount;
        m.totalPool             += amount;

        emit BetPlaced(marketId, msg.sender, outcome, amount);
    }

    // ─── Resolution ───────────────────────────────────────────────────────────

    /**
     * @notice Resolve a market with the winning outcome
     * @dev Called by relayer when Polymarket resolves the market
     * @param marketId       ID of the market
     * @param winningOutcome Index of the winning outcome
     */
    function resolveMarket(
        uint256 marketId,
        uint8   winningOutcome
    ) external onlyRelayerOrOwner marketExists(marketId) notResolved(marketId) {
        Market storage m = markets[marketId];
        require(winningOutcome < m.outcomeLabels.length, "Invalid outcome");

        m.resolved       = true;
        m.winningOutcome = winningOutcome;

        emit MarketResolved(marketId, winningOutcome);
    }

    /**
     * @notice Cancel a market (e.g. if Polymarket cancels it)
     * @dev All bettors can claim full refund
     */
    function cancelMarket(
        uint256 marketId
    ) external onlyRelayerOrOwner marketExists(marketId) notResolved(marketId) {
        markets[marketId].cancelled = true;
        emit MarketCancelled(marketId);
    }

    // ─── Claiming ─────────────────────────────────────────────────────────────

    /**
     * @notice Claim winnings after market resolution
     * @dev Winners get proportional share of losing pool minus 1% fee
     * @param marketId  ID of the resolved market
     */
    function claimWinnings(uint256 marketId)
        external
        marketExists(marketId)
    {
        Market storage m = markets[marketId];
        require(m.resolved || m.cancelled, "Not resolved yet");

        uint256[] storage betIndices = userMarketBetIndices[marketId][msg.sender];
        require(betIndices.length > 0, "No bets found");

        uint256 totalPayout = 0;

        for (uint256 i = 0; i < betIndices.length; i++) {
            Bet storage bet = marketBets[marketId][betIndices[i]];
            if (bet.claimed) continue;

            bet.claimed = true;

            if (m.cancelled) {
                // full refund on cancel
                totalPayout += bet.amount;
            } else if (bet.outcome == m.winningOutcome) {
                // winner: proportional share of total pool minus fee
                uint256 winningPool = m.outcomePools[m.winningOutcome];
                if (winningPool == 0) continue;

                // gross payout = (bet / winningPool) * totalPool
                uint256 gross = (bet.amount * m.totalPool) / winningPool;

                // deduct 1% fee
                uint256 fee = (gross * feeBps) / 10000;
                collectedFees += fee;
                totalPayout += gross - fee;
            }
            // losers get nothing
        }

        require(totalPayout > 0, "Nothing to claim");

        bool ok = rUSD.transfer(msg.sender, totalPayout);
        require(ok, "rUSD transfer failed");

        emit WinningsClaimed(marketId, msg.sender, totalPayout);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getMarket(uint256 marketId)
        external
        view
        returns (Market memory)
    {
        return markets[marketId];
    }

    function getMarketCount() external view returns (uint256) {
        return _marketCounter;
    }

    function getMarketBets(uint256 marketId)
        external
        view
        returns (Bet[] memory)
    {
        return marketBets[marketId];
    }

    function getUserBetIndices(uint256 marketId, address user)
        external
        view
        returns (uint256[] memory)
    {
        return userMarketBetIndices[marketId][user];
    }

    function getOutcomePools(uint256 marketId)
        external
        view
        returns (uint256[] memory)
    {
        return markets[marketId].outcomePools;
    }

    /**
     * @notice Calculate potential payout for a bet (before fee)
     * @param marketId  Market ID
     * @param outcome   Outcome index
     * @param amount    Bet amount in rUSD
     */
    function estimatePayout(
        uint256 marketId,
        uint8   outcome,
        uint256 amount
    ) external view marketExists(marketId) returns (uint256 gross, uint256 net) {
        Market storage m = markets[marketId];
        uint256 newPool = m.outcomePools[outcome] + amount;
        uint256 newTotal = m.totalPool + amount;

        gross = (amount * newTotal) / newPool;
        uint256 fee = (gross * feeBps) / 10000;
        net = gross - fee;
    }

    function getUserBetHistory(address user)
        external
        view
        returns (uint256[] memory)
    {
        return userBetIds[user];
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function withdrawFees(address to) external onlyOwner {
        uint256 amount = collectedFees;
        require(amount > 0, "No fees to withdraw");
        collectedFees = 0;
        bool ok = rUSD.transfer(to, amount);
        require(ok, "Transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayer = newRelayer;
        emit RelayerUpdated(newRelayer);
    }

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "Max 5%");
        feeBps = newFeeBps;
    }

    function setRUSD(address newRUSD) external onlyOwner {
        rUSD = IERC20(newRUSD);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
