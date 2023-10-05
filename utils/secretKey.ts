import fs from "fs";
import path from "path";

export const secretKey = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "/home/tung/Downloads/wallet-keypair.json"),
    { encoding: "utf-8" },
  ),
);
