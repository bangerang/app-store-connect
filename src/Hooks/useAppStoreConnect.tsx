import { useEffect, useState, useCallback } from "react";
import { showToast, Toast, LocalStorage, Cache } from "@raycast/api";
import { SignJWT, importPKCS8 } from 'jose';
import fetch from "node-fetch";
import { set, z } from "zod";

interface AppStoreConnectApiHookOptions {
  version?: number;
  urlBase?: string;
  tokenExpiresInSeconds?: number;
  automaticRetries?: number;
  logRequests?: boolean;
}

const cache = new Cache()

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export function useAppStoreConnectApi<T>(path: string | undefined, schema: z.Schema<T>, method: Method = "GET", body?: any) {
  const [url, setURL] = useState<string>("https://api.appstoreconnect.apple.com/v1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<T | null>(null);
  const [rawData, setRawData] = useState<any | null>(null);

  const [error, setError] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (path === undefined) {
        return;
      }
      // const cachedData = cache.get(path);
      // if (cachedData !== undefined) {
      //   setIsLoading(false);

      //   // Decode the cached data from a string to a Uint8Array
      //   const uint8Array = new Uint8Array(cachedData.split(',').map(Number));
        

      //   // Convert the Uint8Array to a string
      //   const utf8Data = new TextDecoder().decode(uint8Array);
      //   // Parse the JSON string into a JavaScript object
      //   const data = JSON.parse(utf8Data);
      //   setData(data);
      //   return;
      // }
      setIsLoading(true);
      try {
        const response = await fetchAppStoreConnect(path, method, body);
        if (!response) {
          console.log("Failed to fetch data");
          setError(new Error("Failed to fetch data"));
          setIsLoading(false);
          return;
        }
        const json = await response.json();
        const item = schema.safeParse(json.data);
        if (!item.success) {
          console.log("Parsing failed", {path}, item.error);
          console.log("JSON", json.data[0].relationships.visibleApps.data);
          setError(item.error);
          setIsLoading(false);
          return;
        } else {
          console.log("Parsing success", {path}, item.data);
          console.log("JSON", json);
          setData(item.data);
        }
        setIsLoading(false);
      // // UTF8 encode the JSON string
      // const utf8Json = new TextEncoder().encode(JSON.stringify(json));
      // // Convert the UTF-8 encoded JSON string to a Uint8Array
      // const uint8Array = new Uint8Array(utf8Json);
      // // Store the Uint8Array in the cache as string
      // cache.set(path, uint8Array.toString());
      } catch (error) {
        setError(error);
        setIsLoading(false);
      }
    })();
  },[path, url]);

  return {
    isLoading,
    data,
    error,
    rawData
  };
}

export function useAppStoreConnectApiNoData<T>(path: string | undefined, schema: z.Schema<T>, method: Method = "GET", body?: any) {
  const [url, setURL] = useState<string>("https://api.appstoreconnect.apple.com/v1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<T | null>(null);
  const [rawData, setRawData] = useState<any | null>(null);

  const [error, setError] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (path === undefined || path.length === 0) {
        setData(null);
        return;
      }
      // const cachedData = cache.get(path);
      // if (cachedData !== undefined) {
      //   setIsLoading(false);

      //   // Decode the cached data from a string to a Uint8Array
      //   const uint8Array = new Uint8Array(cachedData.split(',').map(Number));
        

      //   // Convert the Uint8Array to a string
      //   const utf8Data = new TextDecoder().decode(uint8Array);
      //   // Parse the JSON string into a JavaScript object
      //   const data = JSON.parse(utf8Data);
      //   setData(data);
      //   return;
      // }
  
      setIsLoading(true);
      try {
        const response = await fetchAppStoreConnect(path, method, body);
        if (!response) {
          console.log("Failed to fetch data");
          setError(new Error("Failed to fetch data"));
          setIsLoading(false);
          return;
        }
        const json = await response.json();
        const item = schema.safeParse(json);
        if (!item.success) {
          console.log("Parsing failed", {path}, item.error);
          setError(item.error);
          setIsLoading(false);
          return;
        } else {
          console.log("Parsing success", {path}, item.data);
          setData(item.data);
        }
        setIsLoading(false);
      // // UTF8 encode the JSON string
      // const utf8Json = new TextEncoder().encode(JSON.stringify(json));
      // // Convert the UTF-8 encoded JSON string to a Uint8Array
      // const uint8Array = new Uint8Array(utf8Json);
      // // Store the Uint8Array in the cache as string
      // cache.set(path, uint8Array.toString());
      } catch (error) {
        setError(error);
        setIsLoading(false);
      }
    })();
  },[path, url]);

  return {
    isLoading,
    data,
    error,
    rawData
  };
}


export class ATCError extends Error {
  constructor(
    public title: string,
    public detail: string
  ) {
    super(title);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ATCError);
    }
  }
}

function decodeBase64(encodedString: string) {
  // Check if we're in a Node.js environment
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(encodedString, 'base64').toString('utf-8');
  } 
  // Check if we're in a browser environment
  else if (typeof atob === 'function') {
    return atob(encodedString);
  } 
  else {
    throw new Error('Unable to decode Base64: environment not supported');
  }
}

function base64EncodePrivateKey(privateKey: string) {
  // Check if we're in a browser environment
  if (typeof btoa === 'function') {
    return btoa(privateKey);
  } 
  // For Node.js environment
  else if (typeof Buffer !== 'undefined') {
    return Buffer.from(privateKey).toString('base64');
  } 
  else {
    throw new Error('Unable to base64 encode: environment not supported');
  }
}

const getBearerToken = async () => {
  const alg = 'ES256';
  const apiKey = await LocalStorage.getItem<string>("apiKey");
  const issuerId = await LocalStorage.getItem<string>("issuerID");
  const encoded = await LocalStorage.getItem<string>("privateKey");
  if (!apiKey || !issuerId || !encoded) {
      // setError(new Error("Missing API credentials"));
      // setIsLoading(false);
      showToast(Toast.Style.Failure, "Missing API credentials");
      return;
  }
  const privateKey = decodeBase64(encoded);
  
  const secret = await importPKCS8(privateKey, alg);
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg, kid: apiKey, typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(issuerId)
    .setAudience('appstoreconnect-v1')
    .setExpirationTime('20m')
    .sign(secret);
  return jwt;
}

export const fetchAppStoreConnect = async (path: string, method: Method = "GET", body?: any) => {
  const bearerToken = await getBearerToken();
  if (!bearerToken) {
    return;
  }
  const response = await fetch("https://api.appstoreconnect.apple.com/v1" + path, {
    method: method,
    headers: {
      Authorization: "Bearer " + bearerToken,
      "Content-Type": "application/json"
    },
    body: method === "GET" ? undefined : JSON.stringify(body)
  });
  if (response && !response.ok) {
    const json = await response.json();
    if ("errors" in json) {
      const errors = json.errors;
      if (errors.length > 0) {
        throw new ATCError(errors[0].title, errors[0].detail);
      } else {
        throw new ATCError("Oh no!", "Something went wrong, error code: " + response.status);
      }
    } else {
      throw new ATCError("Oh no!", "Something went wrong, error code: " + response.status);
    }
  }
  return response;
}