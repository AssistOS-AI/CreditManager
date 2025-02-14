let coreUtil = require('../../util/CoreUtil.js');
let MathMoney = coreUtil.MathMoney;

let parseThresholds = coreUtil.parseThresholds;
let computeStakeSublinear = coreUtil.computeStakeSublinear;
let computePercent = coreUtil.computePercent;


function HatefinityLogic(self, persistence) {
    if (!self || !persistence) {
        throw new Error("Self and persistence are required!");
    }
    let settings = {};
    let tickInterval = undefined;


    self.configure = async function (newSettings) {
        settings = newSettings;

        function ensureDefaultSettings(name, defaultValue) {
            if (!settings[name]) {
                settings[name] = defaultValue;
            }
        }
    }

    /*
    function validateObjectIDs(objectIDsAsArray){
        objectIDsAsArray.map(objectID => {
            if(!objectID || typeof objectID !== "string"){
                console.debug("Invalid objectID " + objectID);
                throw new Error("Invalid objectID " + objectID);
            }
        });
    }

    this.taxContent = function(forUser, value, channelID){
        let taxSettings = values.channels[channelID].settings.taxSettings;
        let parsedTaxSettings = parseThresholds(taxSettings);

        let dueTax = 0;
        for(let i = 0; i < parsedTaxSettings.length; i++){
            if(value <= parsedTaxSettings[i].threshold){
                dueTax = parsedTaxSettings[i].value;
                break;
            }
        }
        let taxValue = MathMoney.roundPoints(value * dueTax);
        persistence.transfer( taxValue, forUser, channelID, "Tax for content in channel " + channelID);
        return value - taxValue;
    } */


    self.validateUser = async function validateUser(id, level) {
        let user = await persistence.getUser(id);

        if (user.level === 0 && level > 0) {
            let unlockingPercent = 0;
            switch (level) {
                case 1:
                    unlockingPercent = 0.01;
                    break;
                case 2:
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


    self.tickTack = function tick() { // planed ot be executed once per hour or each XX minutes, days, etc
        console.log("Tick..." );
    }
}


module.exports = {
    initialiseSpecificLogic: function(self, persistence){
        return new HatefinityLogic(self, persistence);
    }

}