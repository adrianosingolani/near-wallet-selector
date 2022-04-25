import 'regenerator-runtime/runtime';
import React, { useCallback, useState, useEffect } from 'react';
import { providers, utils } from "near-api-js";
import Big from 'big.js';
import getConfig from './config.js';

import Form from './components/Form';
import SignIn from './components/SignIn';
import Messages from './components/Messages';

import NearWalletSelector from "@near-wallet-selector/core";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import senderIconUrl from "@near-wallet-selector/sender/assets/sender-icon.png";
import nearWalletIconUrl from "@near-wallet-selector/near-wallet/assets/near-wallet-icon.png";

const SUGGESTED_DONATION = '0';
const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();

// const nearConfig = getConfig(process.env.NEAR_ENV || 'testnet');
const nearConfig = getConfig('testnet');

const App = () => {
  const [messages, setMessages] = useState([]);
  const [account, setAccount] = useState(null);
  const [selector, setSelector] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (account) {
      getMessages()
        .then((nextMessages) => {
          setMessages(nextMessages);
          message.value = "";
          donation.value = SUGGESTED_DONATION;
          fieldset.disabled = false;
          message.focus();
        })
        .catch((err) => {
          alert("Failed to refresh messages");
          console.log("Failed to refresh messages");

          throw err;
        });
    }
  }, [account])

  const getAccount = useCallback(async () => {
    if (!accountId) {
      return null;
    }

    const nodeUrl = selector?.network?.nodeUrl;
    const provider = new providers.JsonRpcProvider({ url: nodeUrl });

    return provider
      .query({
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      })
      .then((data) => ({
        ...data,
        account_id: accountId,
      }));
  }, [accountId, selector?.network]);

  useEffect(() => {
    if (!accountId) {
      return setAccount(null);
    }

    getAccount().then((nextAccount) => {
      setAccount(nextAccount);
    });
  }, [accountId, getAccount]);

  const getMessages = () => {
    const provider = new providers.JsonRpcProvider({
      url: selector.network.nodeUrl,
    });

    return provider
      .query({
        request_type: "call_function",
        account_id: selector.getContractId(),
        method_name: "getMessages",
        args_base64: "",
        finality: "optimistic",
      })
      .then((res) => JSON.parse(Buffer.from(res.result).toString()));
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const { fieldset, message, donation } = e.target.elements;

    fieldset.disabled = true;

    selector
      .signAndSendTransaction({
        signerId: accountId,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "addMessage",
              args: { text: message.value },
              gas: BOATLOAD_OF_GAS,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              deposit: utils.format.parseNearAmount(donation.value || "0"),
            },
          },
        ],
      })
      .then(() => {
        getMessages()
          .then((nextMessages) => {
            setMessages(nextMessages);
            message.value = "";
            donation.value = SUGGESTED_DONATION;
            fieldset.disabled = false;
            message.focus();
          })
          .catch((err) => {
            alert("Failed to refresh messages");
            console.log("Failed to refresh messages");

            throw err;
          });
      })
      .catch((err) => {
        alert("Failed to add message");
        console.log("Failed to add message");

        throw err;
      })
  };

  const signIn = () => {
    selector.show();
  };

  const signOut = () => {
    selector?.signOut()
      .then(() => {
        window.location.replace(window.location.origin + window.location.pathname);
      })
      .catch(err => {
        alert("Failed to sign out");
        console.log("Failed to sign out");

        throw err;
      })
  };

  const syncAccountState = (currentAccountId, newAccounts) => {
    if (!newAccounts.length) {
      localStorage.removeItem("accountId");
      setAccountId(null);
      setAccounts([]);

      return;
    }

    const validAccountId =
      currentAccountId &&
      newAccounts.some((x) => x.accountId === currentAccountId);
    const newAccountId = validAccountId
      ? currentAccountId
      : newAccounts[0].accountId;

    localStorage.setItem("accountId", newAccountId);
    setAccountId(newAccountId);
    setAccounts(newAccounts);
  };

  useEffect(() => {
    NearWalletSelector.init({
      network: nearConfig.networkId,
      contractId: nearConfig.contractName,
      wallets: [
        setupNearWallet({ iconUrl: nearWalletIconUrl }),
        setupSender({ iconUrl: senderIconUrl }),
      ],
    })
      .then((instance) => {
        return instance.getAccounts().then(async (newAccounts) => {
          syncAccountState(localStorage.getItem("accountId"), newAccounts);
          setSelector(instance);
        });
      })
      .catch((err) => {
        alert("Failed to initialise wallet selector");
        console.log("Failed to initialise wallet selector");

        throw err;
      });
  }, []);

  useEffect(() => {
    if (!selector) {
      return;
    }

    const subscription = selector.on("accountsChanged", (e) => {
      syncAccountState(accountId, e.accounts);
    });

    return () => subscription.remove();
  }, [selector, accountId]);


  return (
    <main>
      <header>
        <h1>NEAR Guest Book</h1>
        {account
          ? <button onClick={signOut}>Log out</button>
          : <button onClick={signIn}>Log in</button>
        }
      </header>
      {account
        ? <Form onSubmit={onSubmit} currentUser={account} />
        : <SignIn />
      }
      {!!account && !!messages.length && <Messages messages={messages} />}
    </main>
  );
}

export default App;