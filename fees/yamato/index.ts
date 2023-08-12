import { FetchResultFees, SimpleAdapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import * as sdk from "@defillama/sdk";
import { getBlock } from "../../helpers/getBlock";
import { getPrices } from "../../utils/prices";
import { Chain } from "@defillama/sdk/build/general";
import { ethers } from "ethers";


const contract_interface = new ethers.utils.Interface([
    'event Borrowed(address indexed sender, uint256 currencyAmount, uint256 fee)'
]);

const fetch = async (timestamp: number): Promise<FetchResultFees> => {
    const fromTimestamp = timestamp - 60 * 60 * 24;
    const toTimestamp = timestamp;
    try {
        const fromBlock = (await getBlock(fromTimestamp, CHAIN.ETHEREUM, {}));
        const toBlock = (await getBlock(toTimestamp, CHAIN.ETHEREUM, {}));

        // Fetch event logs
        const eventLogs = await sdk.api.util.getLogs({
            target: '0x02Fe72b2E9fF717EbF3049333B184E9Cd984f257',
            fromBlock: fromBlock,
            toBlock: toBlock,
            topic: '',
            topics: ['0xeae9cfbc77fdd40ca899f36b608256063b2bc9d8178b0220f7ad513e178d6730'],
            keys: [],
            chain: CHAIN.ETHEREUM
        });

        const parsedLogs = eventLogs.output.map((e: any) => contract_interface.parseLog(e));

        // Fetch prices, replace with 0x1cfa5641c01406aB8AC350dEd7d735ec41298372 later (using ibJPY for testing)
        const CJPYAddress = "ethereum:0x5555f75e3d5278082200Fb451D1b6bA946D8e13b";
        const pricesObj: any = await getPrices([CJPYAddress], timestamp);
        const latestPrice = pricesObj[CJPYAddress]["price"];

        const dailyFees = parsedLogs
            .map((e: any) => {
                const feeAmount = Number(e.args[2]) / 10 ** 18 * latestPrice;
                return feeAmount;
            })
            .reduce((a: number, b: number) => a + b, 0);

        const dailyRevenue = dailyFees;

        return {
            dailyFees: `${dailyFees}`,
            dailyRevenue: `${dailyRevenue}`,
            timestamp
        };
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};

const adapter: SimpleAdapter = {
    adapter: {
        [CHAIN.ETHEREUM]: {
            fetch: fetch,
            start: async () => 1690387200,
        },
    }
};

export default adapter;
