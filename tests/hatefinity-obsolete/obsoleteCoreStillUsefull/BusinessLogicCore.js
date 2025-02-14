

//import computeStakeSublinear from '../lib/CoreUtil.js';

let logging = require('../SystemLogs.js')
const {LOG_ACTIONS} = require("./hatefinityConstants");
const coreUtil = require("../../../creditManager/util/CoreUtil");
let parseThresholds = coreUtil.parseThresholds;

async function createBusinessLogicCore(self, persistence, specificLogic, mandatorySettings) {

    for (let key in specificLogic) {
        //console.log("Adding specific logic function " + key);
        if(self.hasOwnProperty(key)){
            throw new Error("Invalid specific member " + key + " already defined");
        }
        if (typeof specificLogic[key] === "function") {
            Object.defineProperty(self, key, {
                value: specificLogic[key].bind(self),
                writable: false,
                enumerable: true,
                configurable: false
            });
        } else {
            self[key] = specificLogic[key];
        }
    }

    specificLogic.setSelf(self);
    let defaultRewardForNewUser = mandatorySettings.defaultRewardNewUser ? mandatorySettings.defaultRewardNewUser : 0.001;

    let enableUserValidation = typeof mandatorySettings.enableUserValidation !== undefined ? mandatorySettings.enableUserValidation : false;
    let unlockedPoints = mandatorySettings.unlockedPoints ? mandatorySettings.unlockedPoints : 0.001;

    if (!mandatorySettings.firstUsersRewards || !mandatorySettings.invitationRewards) {
        throw new Error("Invalid rewards settings");
    }

    let thresholdsForRewardingNewUsers = parseThresholds(mandatorySettings.firstUsersRewards);
    let thresholdsForRewardingInvitationAccepted = parseThresholds(mandatorySettings.invitationRewards);

    console.debug("Thresholds for rewarding new users: ", thresholdsForRewardingNewUsers);
    console.debug("Thresholds for rewarding invitation accepted: ", thresholdsForRewardingInvitationAccepted);

    self.mint = function mint(amount, whyText) {
        persistence.mint(amount, whyText);
    }


    self.createAgent = async function createAgentAccount(agentName, ownerId) {
        let agentInfo = await persistence.createAgentAccount(publicName, ownerId);
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


    async function rewardAndLock(id, amount, lockinProperty, reason) {
        console.debug("Reward for new user " + id + "with " + amount + " points");
        persistence.rewardUser(id, amount, reason);
        if (enableUserValidation) {
            let blockAmount = amount - unlockedPoints;
            if (blockAmount > 0) {
                persistence.lockPoints(id, blockAmount, reason);
            }
            let userAccount = await persistence.getAccount(id);
            console.log("Dump user account at getAccount:", userAccount);
            userAccount.level = 0;
            userAccount[lockinProperty] = blockAmount;
            persistence.updateAccount(id, userAccount);
        }
        if (amount > 0) {
            await logging.userLog(id, {
                action: LOG_ACTIONS.NEW_USER_REWARD,
                details: reason
            })
        }
    }

    self.addUser = async function addUser(email, name, invitingUserID) {
            console.debug("Adding user with email" + email + " with name " + name +  " inviting user " + invitingUserID);
            let user = await persistence.createAccount(email, name, invitingUserID);
            console.log("Dump user account at creation ", user);
            let userNumber = user.accountNumber;

            let rewardForNewUser = getRewardForNewUser(userNumber);
            await rewardAndLock(user.id, rewardForNewUser, "lockedAmountUntilValidation", "New user reward of " + rewardForNewUser + " points");

            let rewardForInvitation = invitingUserID ? getRewardForInvitation(userNumber) : 0;

            if (rewardForInvitation > 0) {
                await rewardAndLock(invitingUserID, rewardForInvitation, "lockedAmountForInvitingUser", "Invitation reward of " + rewardForInvitation + " points");
            }

            console.debug("User created with email " + email + " with name " + name + " and id " + user.id + " inviting user " + invitingUserID);
            return user;
        }

    self.addAccount = self.addUser;


    self.validateUser = async function validateUser(id, level) {
            let user = await persistence.getAccount(id);

            if (user.level === 0 && level > 0) {
                let lockedAmountUntilValidation = user.lockedAmountUntilValidation;
                if(lockedAmountUntilValidation){
                    persistence.unlockPoints(id, lockedAmountUntilValidation, "User validation rewarding the user " + user.id);
                }

                let rewardInvitingUserId = user.invitingUserID;
                if (rewardInvitingUserId) {
                    let lockedAmountForInvitingUser = user.lockedAmountForInvitingUser
                    if (lockedAmountForInvitingUser) {
                        persistence.unlockPoints(rewardInvitingUserId, lockedAmountForInvitingUser, "User validation rewarding the inviter " + user.id);
                    }
                    user.level = level;
                    user.lockedAmountForInvitingUser = 0;
                    persistence.updateAccount(id, user);
                }
            }

            user = await persistence.getAccount(id);
            console.log("Dump user account after validation ", user);
    }

    self.transfer = function transfer(amount, from, to) {
            if (amount === 0) {
                //nothing to transfer
                return;
            }
            return persistence.transfer(amount, from, to, amount);
    }

    self.safeTransfer = function safeTransfer(amount, from, to) {
            if (amount === 0) {
                //nothing to transfer
                return amount;
            }
            let allowed = false;
            //check if between two users, than it is fine
            if (from.startsWith("U")) {
                if (to.startsWith("U")) {
                    allowed = true;
                } else {
                    if (to.startsWith("A")) {
                        if (persistence.agentIsOwnedBy(to, from)) {
                            allowed = true;
                        }
                    }
                }
            } else if (from.startsWith("A")) {
                //agent can transfer only to its owner
                if (to.startsWith("U")) {
                    if (persistence.agentIsOwnedBy(from, to)) {
                        allowed = true;
                    }
                }
            }
            if (allowed) {
                return persistence.transfer(amount, from, to, amount);
            } else {
                throw new Error("Invalid transfer from " + from + " to " + to);
            }
    }

    self.rewardUserFromGlobalAccount = function reward(accountID, amount, reasonWhy) {
            if (amount === 0) {
                //nothing to transfer
                return;
            }
            return persistence.rewardUser(accountID, amount, reasonWhy);
    }


    self.balance = function balance(name) {
            return persistence.getBalance(name);
    }

    self.lockedBalance = function lockedBalance(name) {
        return persistence.getLockedBalance(name);
    }

    let  tickInterval = null;

    this.getMyWealth = function (userID){
        let lockedBalance = persistence.getBalance(userID , false);
        let availableBalance = persistence.getBalance(userID);
        return {
            locked: lockedBalance,
            availableBalance: availableBalance
        }
    }

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
    createCore: async function (persistence, specificLogic, mandatorySettings) {
        let self = {}
        await createBusinessLogicCore(self, persistence, specificLogic, mandatorySettings);
        return self;
    }
}
