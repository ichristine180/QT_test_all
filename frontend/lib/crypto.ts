export const importPublicKey = async (pemKey: string): Promise<CryptoKey> => {
  const pemContents = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'ECDSA',
      namedCurve: 'P-384',
    },
    true,
    ['verify']
  );
};

export const verifySignature = async (
  hash: string,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> => {
  try {
    const hashArray = new Uint8Array(hash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    return await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-384' },
      },
      publicKey,
      signatureBuffer,
      hashArray
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

export const verifyEmailSignature = async (
  emailHash: string,
  emailSignature: string,
  publicKeyPem: string
): Promise<boolean> => {
  try {
    const publicKey = await importPublicKey(publicKeyPem);
    return await verifySignature(emailHash, emailSignature, publicKey);
  } catch (error) {
    console.error('Email signature verification error:', error);
    return false;
  }
};
