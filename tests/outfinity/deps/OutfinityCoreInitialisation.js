let process = require("process");
let fs = require("fs");
let path = require("path");

const businessLogicCore = require("../../../creditManager/GenericCore.js");
const {MathMoney} = require("../../../creditManager/util/CoreUtil");

console.log("Initialisation...");


async function createOutfinityCore() {
    let autoSaver = require('../../../creditManager/persistence/AutoSaverWithStorageStrategy.js').getAutoSaverPersistence();
    await autoSaver.init();

    let persistenceModule =  require('../../../creditManager/persistence/ConfigurablePersistence.js');
    let configurablePersistence = persistenceModule.getPersistentStorage(autoSaver,
        {
            "User": ["email","name", "level", "invitingUserID", "lockedAmountForInvitingUser", "lockedAmountUntilValidation", "unlockedPointsUntilValidation", "lockedPointsUntilValidation"],
            "NFT": ["name" , "ownerID", "boost", "description",  "ownerName", "ownerURL", "ownerDescription", "ownershipPrice", "downloadPrice" ],
            });
    let specificLogicInitialisationFunction = require('../../../creditManager/addons/outfinity/outfinitySpecificLogic.js').initialiseSpecificLogic;
    let logicCore = await businessLogicCore.createGenericCore(configurablePersistence, specificLogicInitialisationFunction, {
        firstUsersRewards: ["100000:10000", "5000000:1000", "1000000:100"], // reward for the first users creating accounts
        invitationRewards: ["2048:100", "100000:100", "5000000:10", "1000000:1"],   // reward for the invitees when an invitation is accepted The first 5 users registered get 1 tokens, the next 15 get 1 token
        unlockedPoints: 10, // how many points are unlocked for each user
        defaultRewardNewUser: 10, // default reward for a new user
        initialTokenPrice: 1
    });

    logicCore.shutDown = async function(){
        await configurablePersistence.shutDown();
    }

    await logicCore.configure({
    })

    return logicCore;
}

let core;

async function getCoreInstance() {
    if (!core) {
        core = await createOutfinityCore();
        //core.allowMethod = require('../../creditManager/access/hatefinity.js').allowMethod.bind(core);
    }

    return core;
}

module.exports = {
    getCoreInstance
}

//wait for 10 seconds
