import { LocalStorage, ActionPanel, Form, Action } from "@raycast/api";
import { useEffect, useState, ReactNode } from "react";
import fs from "fs";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";

interface SignInProps {
    children: ReactNode;
    didSignIn: () => void
  }
  
 export default function SignIn({ children, didSignIn }: SignInProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckConnection, setIsCheckConnection] = useState(false);

    useEffect(() => {
      (async () => {
        const apiKey = await LocalStorage.getItem<string>("apiKey");
        if (apiKey === undefined) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
          didSignIn()
        }
        setIsLoading(false);
      })();
    }, [didSignIn]);

    if (isLoading) {
      return (<Form></Form>);
    }
  
    if (isAuthenticated) {
      return <>{children}</>;
    } else {
      return (
        <Form
          isLoading={isCheckConnection}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Submit"
                onSubmit={(values: { privateKey: string[], apiKey: string, issuerID: string }) => {
                  const file = values.privateKey[0];
                  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
                    return false;
                  }
                  if (values.apiKey === undefined) {
                    return false;
                  }
                  if (values.issuerID === undefined) {
                    return false;
                  }
                  (async () => {
                    setIsCheckConnection(true);
                    
                    const privateKeyContent = fs.readFileSync(file, 'utf8');
                    
                    const encodedPrivateKey = base64EncodePrivateKey(privateKeyContent);
                    
                    await LocalStorage.setItem("apiKey", values.apiKey);
                    await LocalStorage.setItem("privateKey", encodedPrivateKey);
                    await LocalStorage.setItem("issuerID", values.issuerID);
                    try {
                      await fetchAppStoreConnect("/apps")
                      didSignIn()
                      setIsAuthenticated(true)
                    } catch (error) {
                      LocalStorage.removeItem("apiKey");
                      LocalStorage.removeItem("privateKey");
                      LocalStorage.removeItem("issuerID");
                      presentError(error);
                    }
                    setIsCheckConnection(false);
                    setIsLoading(false);
                  })()
                }}
              />
          </ActionPanel>
        }
      >
        <Form.TextField id="issuerID" placeholder="Issuer ID" defaultValue="69a6de7d-dfd1-47e3-e053-5b8c7c11a4d1" />
        <Form.TextField id="apiKey" placeholder="API Key" defaultValue="JASMSH45PH" />
        <Form.FilePicker id="privateKey" title="Private key" allowMultipleSelection={false} />
      </Form>
      );
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