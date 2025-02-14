
function StepExchangeCore(){
    let state = {
        initialPrice: 10,
        multiplier: 2,
        sellOrders: {},
        buyOrders: {},
    };

    this.sell = function(sellerAccountId, amount, stepNumber){
        let price = stepNumber * multiplier * initialPrice;
        let possibleAmount = 0;
        let buyers = [];
        let pendingBuyOrders = state.buyOrders[price];
        while(possibleAmount < amount && pendingBuyOrders.length > 0){
            let buyerOrder = pendingBuyOrders.shift();
            if(buyerOrder.amount + possibleAmount <= amount){
                possibleAmount += buyerOrder.amount;
                buyers.push(buyerOrder);
            } else {
                let remainingAmount = amount - possibleAmount;
                possibleAmount += remainingAmount;
                buyerOrder.amount -= remainingAmount;
                pendingBuyOrders.unshift(buyerOrder);
            }
            if(possibleAmount === amount){
                break;
            }
        }
        if(possibleAmount < amount){
            let pendingSellOrders = state.sellOrders[price];
            if(!pendingSellOrders){
                pendingSellOrders = [];
                state.sellOrders[price] = pendingSellOrders;
            }
            pendingSellOrders.push({
                amount: amount - possibleAmount,
                sellerAccountId,
                timestamp: Date.now()
            });
        }

        return {
            amount: possibleAmount,
            pendingAmount: amount - possibleAmount,
            buyers,
            price: price
        }
    }

    this.buy = function(buyerAccountID, amount, stepNumber, automaticPushInPending){
        let price = stepNumber * multiplier * initialPrice;
        let possibleAmount = 0;
        let sellers = [];
        let pendingSellOrders = state.sellOrders[price];
        if(!pendingSellOrders){
            pendingSellOrders = [];
            state.sellOrders[price] = pendingSellOrders;
        }
        while(possibleAmount < amount && pendingSellOrders.length > 0){
            let sellerOrder = pendingSellOrders.shift();
            if(sellerOrder.amount + possibleAmount <= amount){
                possibleAmount += sellerOrder.amount;
                sellers.push(sellerOrder);
            } else {
                let remainingAmount = amount - possibleAmount;
                possibleAmount += remainingAmount;
                sellerOrder.amount -= remainingAmount;
                pendingSellOrders.unshift(sellerOrder);
            }
            if(possibleAmount === amount){
                break;
            }
        }
        if(possibleAmount < amount && automaticPushInPending){
            let pendingBuyOrders = state.buyOrders[price];
            if(!pendingBuyOrders){
                pendingBuyOrders = [];
                state.buyOrders[price] = pendingBuyOrders;
            }
            pendingBuyOrders.push({
                amount: amount - possibleAmount,
                buyerAccountID,
                timestamp: Date.now()
            });
        }

        return {
            amount: possibleAmount,
            pendingAmount: amount - possibleAmount,
            sellers,
            price: price
        }
    }

    this.getSellPendingOrders = function(){
        return state.sellOrders;
    }

    this.getBuyPendingOrders = function(){
        return state.buyOrders;
    }

    this.serialise = function(){
        return JSON.stringify(state);
    }

    this.load = function(jsonStateAsString){
         state = JSON.parse(json);
    }
}

module.exports = {
    createStepExchangeCore : function() {
        return new PersistenceMixin(loadAndStoreInterface);
    }
}