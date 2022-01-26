module script {

    /**
     * Calculate the steam seller price <br>
     * Stolen and slightly optimized from Steams' economy_common.js
     *
     * @param amount
     * @param publisherFee
     */
    function calculateSellerPrice(amount: number, publisherFee: number = 0.1): { steam_fee: number, publisher_fee: number, fees: number, amount: number } {

        /**
         * Get the fees
         *
         * @param receivedAmount
         * @param publisherFee
         */
        function getFees(receivedAmount: number, publisherFee: number): { steam_fee: number, publisher_fee: number, fees: number, amount: number } {
            const {wallet_fee_base, wallet_fee_percent, wallet_fee_minimum} = {
                wallet_fee_base: 0,
                wallet_fee_percent: 0.05,
                wallet_fee_minimum: 1
            };

            let nSteamFee = Math.floor(Math.max(receivedAmount * wallet_fee_percent, wallet_fee_minimum) + wallet_fee_base);
            let nPublisherFee = Math.floor(publisherFee > 0 ? Math.max(receivedAmount * publisherFee, 1) : 0);
            let nAmountToSend = receivedAmount + nSteamFee + nPublisherFee;

            return {
                steam_fee: nSteamFee,
                publisher_fee: nPublisherFee,
                fees: nSteamFee + nPublisherFee,
                amount: ~~nAmountToSend
            };
        }

        const {wallet_fee_base, wallet_fee_percent} = {
            wallet_fee_base: 0,
            wallet_fee_percent: 0.05
        };

        // Since getFees has a Math.floor, we could be off a cent or two. Let's check:
        let iterations = 0; // shouldn't be needed, but included to be sure nothing unforeseen causes us to get stuck
        let estimatedReceivedValue = (amount - wallet_fee_base) / (wallet_fee_percent + publisherFee + 1);

        let undershot = false;
        let fees = getFees(estimatedReceivedValue, publisherFee);

        while (fees.amount != amount && iterations < 10) {
            if (fees.amount > amount) {
                if (undershot) {
                    fees = getFees(estimatedReceivedValue - 1, publisherFee);
                    fees.steam_fee += (amount - fees.amount);
                    fees.fees += (amount - fees.amount);
                    fees.amount = amount;

                    break;
                } else {
                    estimatedReceivedValue--;
                }
            } else {
                undershot = true;
                estimatedReceivedValue++;
            }

            fees = getFees(estimatedReceivedValue, publisherFee);
            iterations++;
        }

        return fees;
    }

    let valueSteps: number[] = [
        3, 4, 5, 6, 7, 8, 9, 10,
        20, 30, 40, 50, 60, 70, 80, 90, 100,
        200, 300, 400, 500, 600, 700, 800, 900, 1_000,
        2_000, 3_000, 4_000, 5_000, 6_000, 7_000, 8_000, 9_000, 10_000,
        20_000, 30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000, 100_000,
        110_000, 120_000, 130_000, 140_000, 150_000, 160_000, 170_000, 180_000, 190_000, 200_000
    ];

    interface Steps {
        amountSteps: {
            data: number[],
            enabled: boolean
        },
        feeSteps: {
            data: number[],
            enabled: boolean
        },
        feePercentSteps: {
            data: number[],
            enabled: boolean
        }
    }

    function makeSteps(values: number[], status?: [boolean, boolean, boolean]): Steps {
        let amountSteps: number[] = [];
        let feeSteps: number[] = [];
        let feePercentSteps: number[] = [];

        for (let l_value of values) {
            let calc = calculateSellerPrice(l_value);

            amountSteps.push(calc.amount / 100);
            feeSteps.push((calc.amount - calc.fees) / 100);
            feePercentSteps.push((~~((1 - ((calc.amount - calc.fees) / calc.amount)) * 10_000)) / 100);
        }

        return {
            amountSteps: {
                data: amountSteps,
                enabled: (status ?? [true])[0]
            },
            feeSteps: {
                data: feeSteps,
                enabled: (status ?? [true, true])[1]
            },
            feePercentSteps: {
                data: feePercentSteps,
                enabled: (status ?? [true, true, true])[2]
            }
        };
    }

    let target_steps = makeSteps(valueSteps);

    // console.debug(amountSteps, feeSteps);

    const options = {
        interaction: {
            mode: 'index',
            intersect: false
        }
    };

    let context_target = (<HTMLCanvasElement>document.querySelector('#target')).getContext('2d');
    let context_visualizer = (<HTMLCanvasElement>document.querySelector('#visualizer')).getContext('2d');

    function createChart(context: CanvasRenderingContext2D, steps: Steps): Chart {
        return new Chart.Chart(context, {
            type: 'line',
            data: {
                labels: steps.amountSteps.data,
                datasets: [
                    {
                        label: 'Before Fees',
                        data: steps.amountSteps.data,
                        backgroundColor: '#00cbb3',
                        hidden: !steps.amountSteps.enabled
                    },
                    {
                        label: 'After Fees',
                        data: steps.feeSteps.data,
                        backgroundColor: '#9100cb',
                        hidden: !steps.feeSteps.enabled
                    },
                    {
                        label: '% Fees',
                        data: steps.feePercentSteps.data,
                        backgroundColor: '#cb5b00',
                        hidden: !steps.feePercentSteps.enabled
                    }
                ]
            },
            options: <unknown>options
        });
    }

    createChart(context_target, target_steps);

    let userChart: Chart;
    let input_buyer_price = <HTMLInputElement>document.querySelector('#buyer_price');
    let span_seller_gain = <HTMLElement>document.querySelector('#seller_gain');
    let span_fees = <HTMLElement>document.querySelector('#fees');

    export function update() {
        let val = +input_buyer_price.value;

        if (isNaN(val) || !isFinite(val)) return;

        if (val < 0.03) val = 0.03;

        if (userChart) userChart.destroy();

        let calc = calculateSellerPrice(~~(val * 100));

        span_seller_gain.innerHTML = `${(calc.amount - calc.fees) / 100}`;
        span_fees.innerHTML = `${calc.fees / 100} (${(~~((1 - ((calc.amount - calc.fees) / calc.amount)) * 10_000)) / 100}%)`;

        let steps = makeSteps([
            -100, -50, -10, -5, -3, -2, -1,
            1, 2, 3, 5, 10, 50, 100
        ].map(x => {
            let d_value = ~~(val * 100) + x;

            if (d_value < 3) d_value = 3;

            return d_value;
        }), [false, false, true]);

        userChart = createChart(context_visualizer, steps);
    }

}
