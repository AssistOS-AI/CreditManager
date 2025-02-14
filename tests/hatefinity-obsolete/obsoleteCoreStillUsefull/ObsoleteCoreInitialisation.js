let process = require("process");
let fs = require("fs");
let path = require("path");

let coreUtil = require("../../../creditManager/util/CoreUtil.js");

let constants = require("./hatefinityConstants.js");



const businessLogicCore = require("./BusinessLogicCore.js");
const {MathMoney} = require("../../../creditManager/util/CoreUtil");

console.log("Initialisation...");


async function createHatefinityCore() {
    let persistence = require('./hatefinityPersistence.js').initialisePersistence();
    let specificLogic = require('./hatefinitySpecificLogic.js').initialiseSpecificLogic(persistence);
    let logicCore = await businessLogicCore.createCore(persistence, specificLogic, {
        firstUsersRewards: ["2048:10", "100000:5", "5000000:1", "1000000:0.1"], // reward for the first users creating accounts
        invitationRewards: ["2048:1", "100000:1", "5000000:0.2", "1000000:0.1"],   // reward for the invitees when an invitation is accepted The first 5 users registered get 1 tokens, the next 15 get 1 token
        unlockedPoints: 0.1, // how many points are unlocked for each user
        enableUserValidation: true, // how many points are locked for each user
        defaultRewardNewUser: 0.01 // default reward for a new user
    });

    logicCore.shutDown = async function(){
        await persistence.autoSaver.shutDown();
    }

    await logicCore.configure({
        rewardArticles: function (coreLogic, allActiveArticlesGroupedByChannel, tickNumber) {

            /* for(let key in coreLogic){
                console.log("Key ", key);
            } */

            let allArticlesArray = [];
            let channelsCount = 0;
            //persistence.mint(100, "General reward at tick " + tickNumber);
            for (let channel in allActiveArticlesGroupedByChannel) {
                allArticlesArray = allArticlesArray.concat(allActiveArticlesGroupedByChannel[channel]);
                channelsCount++;
            }

            allArticlesArray.sort((a, b) => {
                return b.currentWeight - a.currentWeight;
            });

            //top 10 articles, split 1 tokens between stakeholders
            for (let i = 0; i < 10 && i < allArticlesArray.length; i++) {
                let stakeHolders = allArticlesArray[i].currentStakeHolders;
                for (let stakeHolderId in stakeHolders) {
                    let stakeHolderPercent = stakeHolders[stakeHolderId];
                    coreLogic.rewardUserFromGlobalAccount(stakeHolderId, 1 * stakeHolderPercent, "1 Point reward for global Top 10 articles " + allArticlesArray[i].id);
                }
            }

            // get stakeholder percent for all channels and reward them 10 points based on the amount of money in each  channel
            let stakeHoldersPercent = coreLogic.getChannelsWeight();
            for(let channelId in stakeHoldersPercent){
                coreLogic.rewardChannel(10 * stakeHoldersPercent[channelId], channelId, "Reward for channel " + channelId + " reward percent ", stakeHoldersPercent[channelId] * 100 , "%");
            }

            //top x articles in each channel, split the reward accumulated in each channel
            for (let channelId in allActiveArticlesGroupedByChannel) {
                let channelMoney = coreLogic.getChannelBalance(channelId);
                channelMoney = coreLogic.rewardChannelStakeholders(channelMoney, channelId); //reward channel stakeholders
                let rewardedArticlesNumber = coreLogic.getNumberOfRewardedArticles(channelId);

                let channelArticlesArray = allActiveArticlesGroupedByChannel[channelId];
                for (let i = 0; i < rewardedArticlesNumber && i < allArticlesArray.length; i++) {
                    if(!channelArticlesArray[i]){
                        console.log("Article not found ", i, " in channel ", channelId);
                        continue;
                    }
                    let stakeHolders = channelArticlesArray[i].currentStakeHolders;
                    for (let stakeHolderId in stakeHolders) {
                        let stakeHolderPercent = stakeHolders[stakeHolderId];
                        coreLogic.rewardUserFromChannelAccount(channelId,
                                stakeHolderId,
                                MathMoney.roundPoints(channelMoney / rewardedArticlesNumber * stakeHolderPercent),
                            "Top" + rewardedArticlesNumber + " articles in channel  " + channelId + " for article" + channelArticlesArray[i].id);
                    }
                }
            }
        },
        //global system settings
        channelCreationPrice: 10, // minimal amount of points required to be a stakeholder to boost a chanel
        maxNumberOfTokens: constants.MAX_NUMBER_OF_TOKENS, // maximum number of tokens that can be minted
        initialNumberOfTokens: constants.MAX_NUMBER_OF_TOKENS, // initial number of tokens minted
        //channel specific settings
        tickReduction: 1, // how many times the weight get reduced or boosted for future ticks. For example if tickReduction is 10, it will be boosting between 10 - 1 times in the next 10 ticks but then the boost will decrease towards 0 fast
        minBoostAmount: 0.001,  // minimal amount blocked required for creating a post, a comment or for any boost
        maxNumberOfActiveArticlesInChannel: 10, // how many articles can be active in a channel, the articles positioned after the first maxNumberOfActiveArticlesInChannel in a channel will get destroyed and the accumulated benefits distributed to stakeholders
        alphaForQuadraticStakeDistribution: 0.5,  // this is for quadratic stakeholder distribution must be between 1 and 0, where 0 is pure democratic and 1 is proportional distribution of rewards
        numberOfRewardedArticles: 10, // how many articles are rewarded in each channel for each tick
        taxSettings:["1:0.01", "10:0.02", "100:0.05", "1000:0.1", "10000:0.2", "100000:0.5", "1000000:1"] // taxes for any creation or boost of content
    })

    return logicCore;
}

let hateFinityCore;

async function getCoreInstance() {
    if (!hateFinityCore) {
        hateFinityCore = await createHatefinityCore();
        hateFinityCore.allow = require('../../../hatefinity-apis/apiutils/hatefinity.js').allow.bind(hateFinityCore);
    }

    return hateFinityCore;
}

module.exports = {
    getCoreInstance
}

//wait for 10 seconds
