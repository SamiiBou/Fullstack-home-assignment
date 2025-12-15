import {Provider, ethers, Log} from 'ethers';
import {provider, USDT_ADDRESS_ETH} from '../config/ethereum'


export class fetchDataByTimeStamp{
    constructor (){

    }

    async getBlockByTimeStamp(provider : Provider, timestamp: number){
        let lastBlockNumber :number = await provider.getBlockNumber();
        let firstBlockNumber :number = 0;

        const firstBlock = provider.getBlock(firstBlockNumber);
        const lastBlock = provider.getBlock(lastBlockNumber);

        while (firstBlockNumber<lastBlockNumber){
            const mid = Math.floor((lastBlockNumber+firstBlockNumber)/2);
            const block = await provider.getBlock(mid);
            const firstBlock = await provider.getBlock(firstBlockNumber);
            const lastBlock = await provider.getBlock(lastBlockNumber);

            console.log('target imestamp : ', timestamp);
            console.log('lower limit timestamp', firstBlock?.timestamp);
            console.log('higher limit timestamp', lastBlock?.timestamp);

            if(block && block.timestamp<timestamp){
                firstBlockNumber=mid+1;
            }else{
                lastBlockNumber=mid;
            }
        }

        const targetBlock = await provider.getBlock(firstBlockNumber);
        console.log('target block number',firstBlockNumber);
        console.log('target block timestamp',targetBlock?.timestamp);

        return firstBlockNumber;
    }

    async getLogsByTimeStamp(provider: Provider, startTimestamp: number, endTimestamp: number) {
        const firstBlockNumber = await this.getBlockByTimeStamp(provider, startTimestamp);
        const lastBlockNumber = await this.getBlockByTimeStamp(provider, endTimestamp);
      
        const chunkSize = 50;            
        const parallelCalls = 17;         
        const logsTable: Log[] = [];
        const transferTopic = ethers.id("Transfer(address,address,uint256)");
      
        console.log("transferTopic", transferTopic);
      
        for (let i = firstBlockNumber; i <= lastBlockNumber; i += chunkSize * parallelCalls) {
          const promises: Promise<Log[]>[] = [];

          for (let p = 0; p < parallelCalls; p++) {
            const fromBlock = i + p * chunkSize;
            if (fromBlock > lastBlockNumber) break;
      
            const toBlock = Math.min(fromBlock + chunkSize - 1, lastBlockNumber);
      
            promises.push(
              provider.getLogs({
                address: USDT_ADDRESS_ETH,
                fromBlock,
                toBlock,
                topics: [transferTopic],
              })
            );
          }
      
          const results = await Promise.all(promises);
          for (let k = 0; k < results.length; k++) {
            const logs = results[k];
            logsTable.push(...logs);
          }
          const fetched = results.reduce((sum, arr) => sum + arr.length, 0);
          console.log(`block : ${i}`);
        }
        console.log('data struct',logsTable[1]);
        return logsTable;
      }
      
}