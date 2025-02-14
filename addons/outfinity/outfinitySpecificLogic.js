let coreUtil = require('../../util/CoreUtil.js');
let MathMoney = coreUtil.MathMoney;

let parseThresholds = coreUtil.parseThresholds;
let computeStakeSublinear = coreUtil.computeStakeSublinear;
let computePercent = coreUtil.computePercent;

function OutfinityLogic(self, persistence){
    let settings = {};

    let tickInterval = undefined;


    self.configure = async function(newSettings){
        settings = newSettings;
        function ensureDefaultSettings(name, defaultValue){
            if (!settings[name]){
                settings[name] = defaultValue;
            }
        }
    }

    self.validateUser = async function validateUser(id, level) {
        let user = await persistence.getUser(id);
        if (user.level === 0 && level > 0) {
            let unlockingPercent = 1;
            switch (level) {
                case 1:
                    unlockingPercent = 0.1;
                    break;
                default:
                    unlockingPercent = 1;
            }
            let lockedAmountUntilValidation = user.lockedAmountUntilValidation * unlockingPercent;
            user.lockedAmountUntilValidation -= lockedAmountUntilValidation;
            if (lockedAmountUntilValidation) {
                persistence.unlockPoints(id, lockedAmountUntilValidation, "User validation rewarding the user " + user.id);
            }
            let rewardInvitingUserId = user.invitingUserID;
            if (rewardInvitingUserId) {
                let lockedAmountForInvitingUser = user.lockedAmountForInvitingUser * unlockingPercent;
                user.lockedAmountForInvitingUser -= lockedAmountForInvitingUser;
                if (lockedAmountForInvitingUser) {
                    persistence.unlockPoints(rewardInvitingUserId, lockedAmountForInvitingUser, "User validation rewarding the inviter " + user.id);
                }
            }

            await persistence.setUserLevel(id, level);
            if(user.lockedAmountUntilValidation > 0){
                await self.confiscateLockedPoints(id, user.lockedAmountUntilValidation, "After setting the user level");
            }
            if(user.lockedAmountForInvitingUser > 0){
                await self.confiscateLockedPoints(user.invitingUserID, user.lockedAmountForInvitingUser, "After setting the user level");
            }
            await persistence.updateUser(id, {lockedAmountUntilValidation: 0, lockedAmountForInvitingUser: 0});
        }
        user.level = level;
    }

    self.createNFT = async function (ownerID, boostAmount, description){
        let newNFT = {
            boost: boostAmount,
            description: description
        }
        let nft = await persistence.createNFT(newNFT);
        await persistence.addController( nft.id, ownerID, "owner");
        return nft;
    }

    self.updateNFT = async function (NFTId, values){
        await persistence.updateNFT(values);
    }

    self.boostNFT = async function (asUserId, nftId, amount) {
         await persistence.transferPoints( amount, asUserId, nftId , "Boosting NFT " + nftId);
    }


    /* change NFT's ownership */
    self.buyNFT = async function (nftId, buyerID){
        let nft = await persistence.getNFT(nftId);
        let ownerID = await persistence.getOwner(nftId);
        persistence.transfer(nft.ownershipPrice, buyerID, ownerID, "Transferring NFT ownership " + nftId);
        await persistence.deleteController(nftId, ownerID, "owner");
        await persistence.addController(nftId, buyerID, "owner");
    }

    self.isNFTOwner = async function (nftId, userID){
        let ownerID = await persistence.getOwner(nftId);
        return nft.ownerID === userID;
    }

    /* get access to the NFT, ay the download price to the current owner */
    self.buyAccessToNFT = async function (NFTId, buyerID){
        let nft = persistence.getNFTInfo(NFTId);
        let ownerID = await persistence.getOwner(nftId);
        persistence.transfer(nft.downloadPrice, buyerID, ownerID, "Buying NFT access");
    }


    self.safeTransfer = function(amount, from, to) {
        if (amount === 0) {
            //nothing to transfer
            return amount;
        }
        let allowed = false;
        //check if between two users, then it is ok
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


    self.tickTack = function tick() { // planed ot be executed once per hour or each XX minutes, days, etc
        console.log("Tick...");
    }

}


module.exports = {
    initialiseSpecificLogic: function(self, persistence){
        return new OutfinityLogic(self, persistence);
    }

}