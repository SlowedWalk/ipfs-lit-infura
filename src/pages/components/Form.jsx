"use client";

import { useRef, useState } from "react";

import LitUtils from "../utils/litUtil";

const Form = () => {
  const [file, setFile] = useState();
  const fileInput = useRef(null);
  const metadataUrlDiv = useRef(null);
  const sellMetadaDataUrl = useRef(null);
  const descriptionInput = useRef(null);
  const nameInput = useRef(null);
  const priceInput = useRef(null);
  const imageInput = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const data = e.target.files[0];
      const reader = new window.FileReader();
      reader.readAsArrayBuffer(data);

      reader.onloadend = () => {
        setFile(Buffer(reader.result));
        console.log('file', Buffer(reader.result));
      };

      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileData = fileInput.current?.files?.[0];
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(fileData);

    reader.onloadend = () => {
      setFile(Buffer(reader.result));
    };

    const litutils = new LitUtils();
    console.log("File", file);

    const metadataUrl = await litutils.upload({
      chain: "goerli",
      name: nameInput.current?.value,
      description: descriptionInput.current?.value,
      price: priceInput.current?.value,
      image: imageInput.current?.value,
      file: fileInput.current?.files?.[0],
    });
    console.log("MetaData", metadataUrl);

    metadataUrlDiv.current.innerHTML = metadataUrl;
  };

  const handleFileDownload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      console.log(e.target.files[0]);
    }
  };

  const handleBay = async (e) => {
    e.preventDefault();
    const metadataUrl = sellMetadaDataUrl.current?.value;
    const litutils = new LitUtils();
    // const txHash = await litutils.buy(metadataUrl);
    const metadata = await litutils.download(metadataUrl);
  };

  return (
    <div className="relative bg-gray-50 flex flex-col min-h-screen">
      <div className="flex flex-col my-auto">
        <h1>Developer DAO Access</h1>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto ">
          <div className="mb-4">
            <label
              htmlFor="file"
              className="block text-gray-700 font-bold mb-2"
            >
              Select a chain:
            </label>
            <select name="chain" id="chain">
              <option value="ethereum">Ethereum</option>
              <option value="goerli">Goerli</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              htmlFor="file"
              className="block text-gray-700 font-bold mb-2"
            >
              Name:
            </label>
            <input
              type="text"
              id="name"
              ref={nameInput}
              placeholder="Enter file name to sell"
              className="border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="file"
              className="block text-gray-700 font-bold mb-2"
            >
              Description:
            </label>
            <input
              type="text"
              id="description"
              ref={descriptionInput}
              placeholder="Enter file description to sell"
              className="border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="file"
              className="block text-gray-700 font-bold mb-2"
            >
              Price (wei):
            </label>
            <input
              type= "number"
              step="any"
              id="price"
              ref={priceInput}
              placeholder="Enter file price to sell"
              className="border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="file"
              className="block text-gray-700 font-bold mb-2"
            >
              Choose image:
            </label>
            <input
              type="file"
              id="image"
              ref={imageInput}
              className="border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="file"
              className="block text-gray-700 font-bold mb-2"
            >
              Choose a file to sell:
            </label>
            <input
              type="file"
              id="file"
              ref={fileInput}
              onChange={handleFileChange}
              className="border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <button
            type="submit"
            disabled={!file}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${!file && "opacity-50 cursor-not-allowed"
              }`}
          >
            Upload
          </button>
        </form>
        <div id="metadataUrlDiv" ref={metadataUrlDiv}></div>
      </div>

      <div className="flex flex-col my-auto">
        <form className="max-w-md mx-auto">
          <div className="mb-4">
            <label
              htmlFor="file"
              className="block text-gray-700 font-bold mb-2"
            >
              Choose a file to download:
            </label>
            <input
              type="text"
              id="file-to-download"
              placeholder="Enter encrypted file url to download"
              ref={sellMetadaDataUrl}
              className="border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <button
            type="submit"
            onClick={handleBay}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded`}
          >
            Download
          </button>
        </form>
      </div>
    </div>
  );
};

export default Form;
