/**
 * Calculate the steam seller price <br>
 * Stolen and slightly optimized from Steams' economy_common.js
 *
 * @param amount
 * @param publisherFee
 */
function calculateSellerPrice(amount, publisherFee) {
    if (publisherFee === void 0) { publisherFee = 0.1; }
    /**
     * Get the fees
     *
     * @param receivedAmount
     * @param publisherFee
     */
    function getFees(receivedAmount, publisherFee) {
        var _a = {
            wallet_fee_base: 0,
            wallet_fee_percent: 0.05,
            wallet_fee_minimum: 1
        }, wallet_fee_base = _a.wallet_fee_base, wallet_fee_percent = _a.wallet_fee_percent, wallet_fee_minimum = _a.wallet_fee_minimum;
        var nSteamFee = Math.floor(Math.max(receivedAmount * wallet_fee_percent, wallet_fee_minimum) + wallet_fee_base);
        var nPublisherFee = Math.floor(publisherFee > 0 ? Math.max(receivedAmount * publisherFee, 1) : 0);
        var nAmountToSend = receivedAmount + nSteamFee + nPublisherFee;
        return {
            steam_fee: nSteamFee,
            publisher_fee: nPublisherFee,
            fees: nSteamFee + nPublisherFee,
            amount: ~~nAmountToSend
        };
    }
    var _a = {
        wallet_fee_base: 0,
        wallet_fee_percent: 0.05
    }, wallet_fee_base = _a.wallet_fee_base, wallet_fee_percent = _a.wallet_fee_percent;
    // Since getFees has a Math.floor, we could be off a cent or two. Let's check:
    var iterations = 0; // shouldn't be needed, but included to be sure nothing unforeseen causes us to get stuck
    var estimatedReceivedValue = (amount - wallet_fee_base) / (wallet_fee_percent + publisherFee + 1);
    var undershot = false;
    var fees = getFees(estimatedReceivedValue, publisherFee);
    while (fees.amount != amount && iterations < 10) {
        if (fees.amount > amount) {
            if (undershot) {
                fees = getFees(estimatedReceivedValue - 1, publisherFee);
                fees.steam_fee += (amount - fees.amount);
                fees.fees += (amount - fees.amount);
                fees.amount = amount;
                break;
            }
            else {
                estimatedReceivedValue--;
            }
        }
        else {
            undershot = true;
            estimatedReceivedValue++;
        }
        fees = getFees(estimatedReceivedValue, publisherFee);
        iterations++;
    }
    return fees;
}
var valueSteps = [];
var amountSteps = [];
var feeSteps = [];
for (var i = 3, l = 2000 * 100; i < l; i++) {
    valueSteps.push(i);
}
for (var _i = 0, valueSteps_1 = valueSteps; _i < valueSteps_1.length; _i++) {
    var l_value = valueSteps_1[_i];
    var calc = calculateSellerPrice(l_value);
    amountSteps.push(calc.amount / 100);
    feeSteps.push((calc.amount - calc.fees) / 100);
}
console.debug(amountSteps, feeSteps);
