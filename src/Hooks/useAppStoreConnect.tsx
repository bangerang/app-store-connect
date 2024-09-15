import { useEffect, useState, useCallback, useRef } from "react";
import { showToast, Toast, LocalStorage, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { SignJWT, importPKCS8 } from 'jose';
import fetch from "node-fetch";


type Method = "GET" | "POST" | "PATCH" | "DELETE";

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


interface Pagination {
  pageSize: number;
  hasMore: boolean;
  onLoadMore: (page: number) => void;
}

export function useAppStoreConnectApi<T>(path: string | undefined, mapResponse: (response: any) => T, loadAll?: boolean): {
  isLoading: boolean;
  data: T | null;
  error: any;
  pagination: Pagination | undefined;
} {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<any | null>(null);
  const [currentData, setCurrentData] = useState<any | null>(null);

  const [error, setError] = useState<any>(null);
  const [pagination, setPagination] = useState<Pagination | undefined>(undefined);
  const previousPath = useRef("");

  const load = async (path: string) => {
    if (path === previousPath.current) {
      return;
    }
    previousPath.current = path;
    if (path === undefined || path.length === 0) {
      setData(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchAppStoreConnect(path);
      if (!response) {
        setError(new Error("Failed to fetch data"));
        setIsLoading(false);
        return;
      }
      const json = await response.json();
      if (json.links !== undefined && json.links.next !== undefined) {
        setPagination({
          pageSize: 10,
          hasMore: true,
          onLoadMore: (page) => {
            (async () => {
              const url = json.links.next.split("https://api.appstoreconnect.apple.com/v1")[1];
              await load(url);
            })();
          }
        });
      } else {
        if (json.meta && json.meta.paging) {
          setPagination({
            pageSize: json.meta.paging.limit,
            hasMore: false,
            onLoadMore: (page) => {}
          });
        }
      }
      const item = mapResponse(json);
      setCurrentData(item); 
      setIsLoading(false);
    } catch (error) {
      console.log("error", {path}, error);
      setError(error);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (path !== undefined) {
      load(path);
    }
  }, [path]);


  useEffect(() => {
    if (currentData) {
      if (data) {
        if (Array.isArray(data) && Array.isArray(currentData)) {
          setData(data.concat(currentData) as T);
        }
      } else {
        setData(currentData);
      }
    }
  }, [currentData]);

  useEffect(() => {
    if (loadAll) {
      if (pagination) {
        if (pagination.hasMore) {
          pagination.onLoadMore(-1);
        }
      }
    }
  }, [pagination]);

  return {
    isLoading,
    data,
    error,
    pagination
  };
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
  console.log("fetchAppStoreConnect", {path, method, body});
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
    body: body ? JSON.stringify(body) : undefined
  });
  if (response && !response.ok) {
    const json = await response.json();
    if ("errors" in json) {
      const errors = json.errors;
      if (errors.length > 0) {
        console.log("errors", {path}, errors);
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