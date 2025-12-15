import {ethers} from 'ethers';

export const INFAURA_ETH_RPC_URL=process.env.INFAURA_ETH_RPC_URL;
export const USDT_ADDRESS_ETH=process.env.USDT_ADDRESS_ETH;

export const provider = new ethers.JsonRpcProvider(INFAURA_ETH_RPC_URL);