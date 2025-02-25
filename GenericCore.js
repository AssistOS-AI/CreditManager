//import computeStakeSublinear from '../lib/CoreUtil.js';

const coreUtil = require("./util/CoreUtil");
let parseThresholds = coreUtil.parseThresholds;

async function createGenericCore(self, persistence, specificLogicInitialisationMethod, mandatorySettings) {
    specificLogicInitialisationMethod(self, persistence);

    let defaultRewardForNewUser = mandatorySettings.defaultRewardNewUser ? mandatorySettings.defaultRewardNewUser : 0.001;
    let unlockedPoints = mandatorySettings.unlockedPoints ? mandatorySettings.unlockedPoints : 0.001;

    if (!mandatorySettings.firstUsersRewards || !mandatorySettings.invitationRewards) {
        throw new Error("Invalid rewards settings");
    }

    let thresholdsForRewardingNewUsers = parseThresholds(mandatorySettings.firstUsersRewards);
    let thresholdsForRewardingInvitationAccepted = parseThresholds(mandatorySettings.invitationRewards);

    let initialTokenPrice = mandatorySettings.initialTokenPrice ? mandatorySettings.initialTokenPrice : 1;

    console.debug("Thresholds for rewarding new users: ", thresholdsForRewardingNewUsers);
    console.debug("Thresholds for rewarding invitation accepted: ", thresholdsForRewardingInvitationAccepted);

    self.mint = async function mint(amount) {
        await persistence.mintPoints(amount);
    }

    self.claimFounder = async function claimFounderReward(userID, amount) {
        await persistence.rewardFounder(userID, amount, "Founder reward");
    }


    self.createAgent = async function createAgentAccount(agentName, ownerId) {
        let agentInfo = await persistence.createAgent(publicName, ownerId);
        console.debug("Creating channel " + publicName + " with id " + JSON.stringify(channelID));
        return agentInfo.id;
    }

    self.transferAgentOwnership = async function transferAgentOwnership(agentId, newOwnerId) {
        let agentInfo = await persistence.transferAgentOwnership(agentId, newOwnerId);
        console.debug("Transferring ownership of agent " + agentId + " to " + newOwnerId);
        return agentInfo.id;
    }

    function getRewardForNewUser(userNumber) {
        for (let i = 0; i < thresholdsForRewardingNewUsers.length; i++) {
            if (userNumber <= thresholdsForRewardingNewUsers[i].threshold) {
                return thresholdsForRewardingNewUsers[i].value;
            }
        }
        return self.defaultRewardForNewUser;
    }

    function getRewardForInvitation(userNumber) {
        for (let i = 0; i < thresholdsForRewardingInvitationAccepted.length; i++) {
            if (userNumber <= thresholdsForRewardingInvitationAccepted[i].threshold) {
                return thresholdsForRewardingInvitationAccepted[i].value;
            }
        }
        return self.defaultRewardForNewUser;
    }


    async function rewardAndLock(userId, availableAmount, lockAmount, reason) {
        //console.debug("<<<< Reward for new user " + userId + " with " + availableAmount + " points" + " and lock " + lockAmount + " points");
        await persistence.rewardUser(userId, availableAmount + lockAmount, reason);
        await persistence.lockPoints(userId, lockAmount, "Locking until user validation");
        return true;
    }

    self.addUser = async function addUser(email, name, invitingUserID) {
        //console.debug("Adding user with email" + email + " with name " + name +  " inviting user " + invitingUserID);
        let user = await persistence.createUser({
            email,
            name,
            invitingUserID,
            level: 0,
            lockedAmountUntilValidation: 0,
            lockedAmountForInvitingUser: 0
        });
        let userOrder = user.accountNumber;

        let rewardForNewUser = getRewardForNewUser(userOrder);
        rewardForNewUser = rewardForNewUser > 0 ? rewardForNewUser : defaultRewardForNewUser;
        await rewardAndLock(user.id, unlockedPoints, rewardForNewUser - unlockedPoints, "lockedAmountUntilValidation", "New user reward of " + rewardForNewUser + " points");

        let rewardForInvitation = invitingUserID ? getRewardForInvitation(userOrder) : 0;

        if (rewardForInvitation > 0) {
            await rewardAndLock(invitingUserID, unlockedPoints, rewardForInvitation - unlockedPoints, "Invitation reward of " + rewardForInvitation + " points");
        }
        let lockedAmountUntilValidation = rewardForNewUser - unlockedPoints;
        lockedAmountUntilValidation = lockedAmountUntilValidation > 0 ? lockedAmountUntilValidation : 0;
        let lockedAmountForInvitingUser = rewardForInvitation - unlockedPoints;
        lockedAmountForInvitingUser = lockedAmountForInvitingUser > 0 ? lockedAmountForInvitingUser : 0;

        await persistence.updateUser(user.id, {lockedAmountUntilValidation, lockedAmountForInvitingUser});
        return user;
    }

    self.addAccount = self.createAccount = self.addUser;

    self.transfer = function transfer(amount, from, to) {
        if (amount === 0) {
            //nothing to transfer
            return;
        }
        return persistence.transfer(amount, from, to, amount);
    }

    self.getTotalBalance = async function (id) {
        const balance = await self.balance(id);
        const lockedBalance = await self.lockedBalance(id);
        return {balance, lockedBalance};
    }

    self.balance = async function balance(id) {
        try {
            return await persistence.getBalance(id);
        } catch (error) {
            console.error("Error getting balance for " + id + " error is " + error.message);
            return 0;
        }
    }

    self.lockedBalance = async function lockedBalance(id) {
        return await persistence.getLockedBalance(id);
    }

    self.accountStatus = async function accountStatus(name) {
        let availablePoints = await self.balance(name);
        let lockedPoints = await self.lockedBalance(name);
        let estimatedValue = (availablePoints + lockedPoints) * initialTokenPrice;
        return {availablePoints, lockedPoints, estimatedValue};
    }

    self.getExchangeRate = function getExchangeRate() {
        return initialTokenPrice;
    }

    self.getSystemAvailablePoints = async function getAvailablePoints() {
        return await persistence.getBalance("system")
    }

    self.confiscateLockedPoints = async function revertLockedAmount(id, amount, reason) {
        let user = await persistence.getUser(id);
        await persistence.confiscateLockedPoints(id, amount, reason);
    }

    self.getUserLogs = async function (userID) {
        return persistence.getUserLogs(userID);
    }

    self.getUser = async function (userID) {
        return await persistence.getUser(userID);
    }

    /*
    state = "SUCCESS"|"FAIL"
    * */
    self.loginEvent = function (userID, state, reason) {
        persistence.loginEvent(userID, state, reason);
    }

    let tickInterval = null;

    self.start = function (timer) {
        if (timer === undefined) {
            timer = 60 * 60 * 1000;
        }
        tickInterval = setInterval(self.tickTack, timer);
    }

    self.stop = function () {
        clearInterval(tickInterval);
        persistence.shutDown();
    }

    return self;
}


module.exports = {
    createGenericCore: async function (persistence, specificLogicInitialisationMethod, mandatorySettings) {
        let self = {}
        await createGenericCore(self, persistence, specificLogicInitialisationMethod, mandatorySettings);
        return self;
    }
}
