import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "../..");
const keysDir = path.join(projectRoot, "data", "keys");

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const privateKeyPath = path.join(keysDir, "private.pem");
const publicKeyPath = path.join(keysDir, "public.pem");

const generateKeyPair = () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "secp384r1",
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { privateKey, publicKey };
};

const loadOrGenerateKeyPair = () => {
  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");
    const publicKey = fs.readFileSync(publicKeyPath, "utf8");
    console.log("Loaded existing ECDSA keypair");
    return { privateKey, publicKey };
  } else {
    const { privateKey, publicKey } = generateKeyPair();
    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    fs.writeFileSync(publicKeyPath, publicKey);

    console.log("Generated new ECDSA keypair");
    return { privateKey, publicKey };
  }
};

const { privateKey, publicKey } = loadOrGenerateKeyPair();

export const hashData = (data) => {
  return crypto.createHash("sha384").update(data).digest("hex");
};

export const signHash = (hash) => {
  const sign = crypto.createSign("SHA384");
  sign.update(Buffer.from(hash, "hex"));
  sign.end();

  // Use IEEE P1363 format for Web Crypto API compatibility
  const signature = sign.sign({
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  });
  return signature.toString("base64");
};

export const verifySignature = (hash, signature) => {
  try {
    const verify = crypto.createVerify("SHA384");
    verify.update(Buffer.from(hash, "hex"));
    verify.end();

    // Use IEEE P1363 format for Web Crypto API compatibility
    return verify.verify(
      {
        key: publicKey,
        dsaEncoding: 'ieee-p1363'
      },
      Buffer.from(signature, "base64")
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

export const hashAndSignEmail = (email) => {
  const hash = hashData(email);
  const signature = signHash(hash);

  return { hash, signature };
};

export const getPublicKey = () => {
  return publicKey;
};
