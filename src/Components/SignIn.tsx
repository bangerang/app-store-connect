import { LocalStorage, ActionPanel, Form, Action } from "@raycast/api";
import { useEffect, useState, ReactNode } from "react";
import fs from "fs";

interface SignInProps {
    children: ReactNode;
    didSignIn: () => void
  }
  
 export default function SignIn({ children, didSignIn }: SignInProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(false);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
      (async () => {
        const apiKey = await LocalStorage.getItem<string>("apiKey");
        if (apiKey === undefined) {
            console.log("apiKey is undefined")
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

    LocalStorage.clear()
  
    if (isAuthenticated) {
      return <>{children}</>;
    } else {
      return (
        <Form
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
                  // Read the contents of the private key file
                  const privateKeyContent = fs.readFileSync(file, 'utf8');
                  // Encode the private key content
                  const encodedPrivateKey = base64EncodePrivateKey(privateKeyContent);
                  
                  await LocalStorage.setItem("apiKey", values.apiKey);
                  await LocalStorage.setItem("privateKey", encodedPrivateKey);
                  await LocalStorage.setItem("issuerID", values.issuerID);
                  didSignIn()
                  setIsAuthenticated(true)
                })()
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="issuerID" placeholder="Issuer ID" defaultValue="a35be265-0189-439c-9434-e2e89ebb50ef" />
        <Form.TextField id="apiKey" placeholder="API Key" defaultValue="NLXQA3HKF9" />
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