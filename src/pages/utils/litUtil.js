import { ethers } from "ethers";
import { create } from "ipfs-http-client";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import LitJsSdk2 from "lit-js-sdk";
import axios from "axios";

const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();

const accessControlConditions = [
  {
    contractAddress: "",
    standardContractType: "",
    chain: "goerli",
    method: "balanceOf",
    parameters: [":userAddress"],
    returnValueTest: {
      comparator: ">=",
      value: "400",
    },
  },
];

class LitUtils {
  litNodeClient;

  // async connect() {
  //   await client.connect();
  //   this.litNodeClient = client;
  // }
  async connect() {
    const resourceId = {
      baseUrl: "http://localhost:3000",
      path: "/protected",
      orgId: "",
      role: "",
      extraData: id,
    };

    const client = new LitJsSdk.LitNodeClient({ alertWhenUnauthorized: false });
    await client.connect();
    this.litNodeClient = client;
    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: "goerli",
    });

    await client.saveSigningCondition({
      accessControlConditions,
      chain: "goerli",
      authSig,
      resourceId,
    });
    /* try {
      const jwt = await client.getSignedToken({
        accessControlConditions,
        chain: "goerli",
        authSig,
        resourceId: resourceId,
      });
      Cookies.set("lit-auth", jwt, { expires: 1 });
    } catch (err) {
      console.log("error: ", err);
    } */
  }

  async upload(_args) {
    this.chain = _args.chain;
    this.name = _args.name;
    this.description = _args.description;
    this.image = _args.image;
    this.price = ethers.utils.parseEther(_args.price).toString(); // convert to wei
    this.file = _args.file;
    this.image = _args.image;
    this.itemId = Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER
    ).toString(); // uint64ish
    // upload image decentralized storage and get back url
    this.imageUrl = await this.#uploadFile(this.image);
    // encrypt file
    const encryptedFile = await this.#encryptFile(this.file);
    // upload encrypted file decentralized storage and get back url
    this.encryptedFileUrl = await this.#uploadFile(encryptedFile);
    // generate metadata and get back url
    const metadata = this.#generateMetadata();
    // https://bafybeiexzwmq3jxexlbv2tgfzkmu47t3u35h5q4q5ftcjixxy5eaizl3i4.ipfs.infura-ipfs.io/
    const metadataUrl = await this.#uploadJson(metadata);
    return metadataUrl;
  }

  async download(_metadataUrl) {
    if (!this.litNodeClient) {
      await this.connect();
    }
    // fetch metadata from decentralized storage
    const result = () => axios.get(_metadataUrl);
    const {
      encryptedFileUrl,
      evmContractConditions,
      encryptedSymmetricKey,
      filename,
      chain,
    } = (await result()).data;
    console.log("filename: ", filename);

    const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain });

    // obtain decrypted symmetric key
    const symmetricKey = await this.litNodeClient.getEncryptionKey({
      accessControlConditions: evmContractConditions,
      toDecrypt: encryptedSymmetricKey,
      chain,
      authSig,
    });
    console.log("symmetricKey", symmetricKey);
    const file = await fetch(encryptedFileUrl).then((res) => res.blob());
    // decrypt file
    const decryptedFile = await LitJsSdk.decryptFile({
      file,
      symmetricKey,
    });
    console.log("decryptedFile", decryptedFile);
    // download file
    LitJsSdk2.downloadFile({
      filename,
      data: new Uint8Array(decryptedFile),
      memetype: "application/octet-stream",
    });
    console.log("finalFile", finalFile);
  }

  async buy(_metadataUrl) {
    if (!this.litNodeClient) {
      await this.connect();
    }
    // fetch metadata from decentralized storage
    const result = () => axios.get(_metadataUrl);
    const { chain, price, itemId } = (await result()).data;

    /* const { chain, price, itemId } = await fetch(_metadataUrl).then((res) =>
      res.json()
    ); */
    // to switch to correct network
    await LitJsSdk.checkAndSignAuthMessage({ chain });
    // get provider: https://github.com/LIT-Protocol/lit-js-sdk/blob/e148a0d76d706dbe1aaa06cfd2234b3918f2ec2e/src/utils/eth.js#L98
    const { web3 } = await LitJsSdk2.connectWeb3();
    // get signer
    const signer = await web3.getSigner();
    console.log("signer", signer);
    const abi = [
      {
        inputs: [{ internalType: "uint256", name: "_itemId", type: "uint256" }],
        name: "buy",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
    ];
    console.log("abi", abi);
    // call buy function
    const contract = new ethers.Contract(
      this.#getContractAddress(chain),
      abi,
      signer
    );
    const receipt = contract.connect(signer)["buy"](itemId, { value: price });
    return receipt.hash;
  }

  async #encryptFile(_file) {
    if (!this.litNodeClient) {
      await this.connect();
      console.log("connected");
    }

    // sign with metamask
    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: this.chain,
    });
    this.seller = authSig.address;
    // encrypt file
    const { encryptedFile, symmetricKey } = await LitJsSdk.encryptFile({
      file: _file,
    });
    const evmContractConditions = this.#generateEvmContractConditions();
    const encryptedSymmetricKey = await this.litNodeClient.saveEncryptionKey({
      accessControlConditions: evmContractConditions,
      symmetricKey,
      authSig,
      chain: this.chain,
    });
    // included in metadata
    this.filename = _file.name;
    this.encryptedSymmetricKey = LitJsSdk.uint8arrayToString(
      encryptedSymmetricKey,
      "base16"
    );
    return encryptedFile;
  }

  async #uploadFile(_file) {
    // const projectId = "2Nw9uRu1nis4fOlzmY2Pgu9nWFF"; // <---------- your Infura Project ID

    // const projectSecret = "ad1b1514cb15df08b1fb4ef4a44bd65e"; // <---------- your Infura Secret
    // (for security concerns, consider saving these values in .env files)

    // const auth =
    //   "Basic " +
    //   Buffer.from(projectId + ":" + projectSecret).toString("base64");
    // upload file to decentralized storage and get back url
    const formData = new FormData();
    formData.append("file", _file);

    /* const client = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      headers: {
        authorization: auth,
      },
    }); */
    // const response = await client.add(_file);
    const response = await fetch(
      "https://ipfs.infura.io:5001/api/v0/add?pin=true",
      {
        method: "POST",
        body: formData,
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              "2Nw9uRu1nis4fOlzmY2Pgu9nWFF" +
                ":" +
                "ad1b1514cb15df08b1fb4ef4a44bd65e"
            ).toString("base64"),
        },
      }
    ).then((res) => res.json());
    console.log("response: ", response);
    return `https://ipfs.io/ipfs/${response.Hash}`;
  }

  async #uploadJson(_json) {
    const projectId = "2Nw9uRu1nis4fOlzmY2Pgu9nWFF"; // <---------- your Infura Project ID

    const projectSecret = "ad1b1514cb15df08b1fb4ef4a44bd65e"; // <---------- your Infura Secret
    // (for security concerns, consider saving these values in .env files)

    const auth =
      "Basic " +
      Buffer.from(projectId + ":" + projectSecret).toString("base64");

    const client = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      headers: {
        authorization: auth,
      },
    });
    // upload json to decentralized storage and get back url
    const formData = new FormData();
    formData.append(
      "json",
      new Blob([JSON.stringify(_json)], { type: "application/json" })
    );
    // const response = await client.add(formData);
    const response = await fetch(
      "https://ipfs.infura.io:5001/api/v0/add?pin=true",
      {
        method: "POST",
        body: formData,
        headers: {
          Authorization: auth,
        },
      }
    ).then((res) => res.json());
    console.log("response: ", response);
    return `https://ipfs.io/ipfs/${response.Hash}`;
  }

  #generateMetadata() {
    const metadata = {
      name: this.name,
      description: this.description,
      imageUrl: this.imageUrl,
      chain: this.chain,
      price: this.price,
      seller: this.seller,
      itemId: this.itemId,
      filename: this.filename,
      encryptedFileUrl: this.encryptedFileUrl,
      evmContractConditions: this.#generateEvmContractConditions(),
      encryptedSymmetricKey: this.encryptedSymmetricKey,
    };
    console.log("generated metadata", metadata);
    return metadata;
  }

  #getContractAddress(_chain) {
    const contractAddress = {
      ethereum: "0xeth",
      goerli: "0x25Ba45202257e16117db55571eaBb236A07cAE90",
      polygon: "0xpoly",
      arbitrium: "0xarbitrium",
    };
    return contractAddress[_chain];
  }

  #generateEvmContractConditions = () => {
    // https://developer.litprotocol.com/AccessControlConditions/EVM/customContractCalls
    return [
      {
        /* contractAddress: this.#getContractAddress(this.chain),
        chain: this.chain,
        functionName: "items",
        functionParams: [this.itemId],
        functionAbi: {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "items",
          outputs: [
            {
              internalType: "address",
              name: "seller",
              type: "address",
            },
            {
              internalType: "address",
              name: "investor",
              type: "address",
            },
            {
              internalType: "string",
              name: "uri",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "price",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        returnValueTest: {
          key: "seller",
          comparator: "=",
          value: this.seller,
        },
      },
      { operator: "and" },
      {
        contractAddress: this.#getContractAddress(this.chain),
        chain: this.chain,
        functionName: "items",
        functionParams: [this.itemId],
        functionAbi: {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "items",
          outputs: [
            {
              internalType: "address",
              name: "seller",
              type: "address",
            },
            {
              internalType: "address",
              name: "investor",
              type: "address",
            },
            {
              internalType: "string",
              name: "uri",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "price",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        returnValueTest: {
          key: "price",
          comparator: "=",
          value: this.price,
        },
      },
      { operator: "and" }, */
        // {
        /* contractAddress: "",
        standardContractType: "ERC20",
        chain,
        method: "eth_getBalance",
        parameters: [":userAddress", "latest"],
        functionName: "items",
        functionParams: [this.itemId],
        functionAbi: {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "items",
          outputs: [
            {
              internalType: "address",
              name: "seller",
              type: "address",
            },
            {
              internalType: "address",
              name: "investor",
              type: "address",
            },
            {
              internalType: "string",
              name: "uri",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "price",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        returnValueTest: {
          comparator: ">=",
          value: "400",
        }, */

        contractAddress: "",
        standardContractType: "",
        chain: "goerli",
        method: "eth_getBalance",
        parameters: [
          ":userAddress",
          "latest"
      ],
        returnValueTest: {
          comparator: ">=",
          value: "1",
        },
      },
    ];
  };
}

export default LitUtils;
