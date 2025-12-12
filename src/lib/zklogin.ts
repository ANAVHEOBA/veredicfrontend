import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/sui/zklogin";
import { ZKLOGIN_CONFIG } from "./config";

// Storage keys
const STORAGE_KEYS = {
  EPHEMERAL_KEYPAIR: "zklogin_ephemeral_keypair",
  RANDOMNESS: "zklogin_randomness",
  NONCE: "zklogin_nonce",
  MAX_EPOCH: "zklogin_max_epoch",
  JWT_TOKEN: "zklogin_jwt",
  USER_SALT: "zklogin_salt",
  ZK_PROOF: "zklogin_proof",
  USER_ADDRESS: "zklogin_address",
};

// Helper to convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate and store ephemeral keypair
export function generateEphemeralKeyPair(): Ed25519Keypair {
  const keypair = new Ed25519Keypair();
  if (typeof window !== "undefined") {
    // Use localStorage to persist across redirects
    // getSecretKey() returns base64 string in newer SDK versions
    const secretKey = keypair.getSecretKey();
    localStorage.setItem(STORAGE_KEYS.EPHEMERAL_KEYPAIR, secretKey);
    console.log("Stored keypair, length:", secretKey.length);
  }
  return keypair;
}

// Get stored ephemeral keypair
export function getEphemeralKeyPair(): Ed25519Keypair | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(STORAGE_KEYS.EPHEMERAL_KEYPAIR);
  console.log("Retrieved keypair from storage:", stored ? `${stored.substring(0, 20)}... (len: ${stored.length})` : "null");

  if (!stored) return null;

  try {
    // fromSecretKey accepts base64 string in newer SDK versions
    return Ed25519Keypair.fromSecretKey(stored);
  } catch (error) {
    console.error("Error restoring keypair:", error);
    return null;
  }
}

// Generate randomness and store it
export function createRandomness(): string {
  const randomness = generateRandomness();
  if (typeof window !== "undefined") {
    // Use localStorage to persist across redirects
    localStorage.setItem(STORAGE_KEYS.RANDOMNESS, randomness);
  }
  return randomness;
}

// Get stored randomness
export function getStoredRandomness(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.RANDOMNESS);
}

// Generate nonce for OAuth
export function createNonce(
  keypair: Ed25519Keypair,
  maxEpoch: number,
  randomness: string
): string {
  const publicKey = keypair.getPublicKey();
  const nonce = generateNonce(publicKey, maxEpoch, randomness);

  if (typeof window !== "undefined") {
    // Use localStorage to persist across redirects
    localStorage.setItem(STORAGE_KEYS.NONCE, nonce);
    localStorage.setItem(STORAGE_KEYS.MAX_EPOCH, maxEpoch.toString());
  }

  return nonce;
}

// Store JWT token from OAuth callback
export function storeJwtToken(jwt: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.JWT_TOKEN, jwt);
  }
}

// Get stored JWT token
export function getStoredJwtToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
}

// Store user salt
export function storeUserSalt(salt: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.USER_SALT, salt);
  }
}

// Get stored user salt
export function getStoredUserSalt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.USER_SALT);
}

// Store ZK proof
export function storeZkProof(proof: object): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.ZK_PROOF, JSON.stringify(proof));
  }
}

// Get stored ZK proof
export function getStoredZkProof(): object | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEYS.ZK_PROOF);
  return stored ? JSON.parse(stored) : null;
}

// Store user address
export function storeUserAddress(address: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.USER_ADDRESS, address);
  }
}

// Get stored user address
export function getStoredUserAddress(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.USER_ADDRESS);
}

// Get stored max epoch
export function getStoredMaxEpoch(): number | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEYS.MAX_EPOCH);
  return stored ? parseInt(stored, 10) : null;
}

// Clear all zkLogin storage
export function clearZkLoginStorage(): void {
  if (typeof window === "undefined") return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// Build Google OAuth URL
export function buildGoogleOAuthUrl(nonce: string): string {
  const params = new URLSearchParams({
    client_id: ZKLOGIN_CONFIG.GOOGLE_CLIENT_ID,
    redirect_uri: ZKLOGIN_CONFIG.REDIRECT_URI,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Decode JWT to extract claims
export function decodeJwt(jwt: string): {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  aud: string;
  iss: string;
} | null {
  try {
    const payload = jwt.split(".")[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Fetch salt from service (or generate deterministically)
export async function fetchSalt(jwt: string): Promise<string> {
  // Option 1: Use Mysten's salt service
  // const response = await fetch(ZKLOGIN_CONFIG.SALT_SERVICE_URL, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ jwt }),
  // });
  // const { salt } = await response.json();
  // return salt;

  // Option 2: Generate deterministic salt from JWT sub (simpler for dev)
  const claims = decodeJwt(jwt);
  if (!claims?.sub) throw new Error("Invalid JWT");

  // Create a deterministic salt from the user's sub claim
  // The salt must be 16 bytes (128 bits) for the prover
  const encoder = new TextEncoder();
  const data = encoder.encode(claims.sub + "_veredic_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Take only the first 16 bytes (128 bits) of the hash
  const salt16Bytes = hashArray.slice(0, 16);
  const salt = BigInt("0x" + Array.from(salt16Bytes).map((b) => b.toString(16).padStart(2, "0")).join(""));

  return salt.toString();
}

// Fetch ZK proof from prover
export async function fetchZkProof(
  jwt: string,
  extendedEphemeralPublicKey: string,
  maxEpoch: number,
  randomness: string,
  salt: string
): Promise<object> {
  const requestBody = {
    jwt,
    extendedEphemeralPublicKey,
    maxEpoch,
    jwtRandomness: randomness,
    salt,
    keyClaimName: "sub",
  };

  console.log("Prover request:", {
    ...requestBody,
    jwt: requestBody.jwt.substring(0, 50) + "...",
  });

  const response = await fetch(ZKLOGIN_CONFIG.PROVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Prover error response:", errorText);
    throw new Error(`Prover error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
