import {Provider, ethers} from 'ethers';

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
}