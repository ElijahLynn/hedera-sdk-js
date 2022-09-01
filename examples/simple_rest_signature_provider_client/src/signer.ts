import * as hashgraph from "@hashgraph/sdk";
import { SimpleRestProvider, execute } from "./provider";

export class SimpleRestSigner implements hashgraph.Signer {
    private accountId: hashgraph.AccountId;
    private accountKey: hashgraph.PublicKey;
    private provider: SimpleRestProvider | null;

    private constructor(
        accountId: hashgraph.AccountId,
        accountKey: hashgraph.PublicKey,
        provider: SimpleRestProvider | null
    ) {
        this.accountId = accountId;
        this.accountKey = accountKey;
        this.provider = provider;
    }

    static async connect(
        accountId?: hashgraph.AccountId | string
    ): Promise<SimpleRestSigner> {
        const body = {
            accountId: accountId != null ? accountId.toString() : null,
        };
        const response: {
            accountId: string;
            accountKey: string;
            ledgerId: string;
            network: Record<string, string>;
            mirrorNetwork: string[];
        } = await execute("/wallet/connect", body);

        const id = hashgraph.AccountId.fromString(response.accountId);
        const accountKey = hashgraph.PublicKey.fromString(response.accountKey);
        const ledgerId =
            response.ledgerId != null
                ? hashgraph.LedgerId.fromString(response.ledgerId)
                : null;
        const provider = new SimpleRestProvider(
            ledgerId,
            response.network,
            response.mirrorNetwork
        );

        return new SimpleRestSigner(id, accountKey, provider);
    }

    getProvider(): SimpleRestProvider | null {
        return this.provider;
    }

    getAccountId(): hashgraph.AccountId {
        return this.accountId;
    }

    getAccountKey(): hashgraph.PublicKey {
        return this.accountKey;
    }

    getLedgerId(): hashgraph.LedgerId | null {
        return this.provider == null ? null : this.provider.getLedgerId();
    }

    getNetwork(): Record<string, hashgraph.AccountId | string> {
        return this.provider == null ? {} : this.provider.getNetwork();
    }

    getMirrorNetwork(): string[] {
        return this.provider == null ? [] : this.provider.getMirrorNetwork();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async sign(messages: Uint8Array[]): Promise<hashgraph.SignerSignature[]> {
        const response = await execute("/wallet/sign", {
            bytes: messages.map((message) =>
                Buffer.from(message).toString("hex")
            ),
        });

        return response.response.map(
            (signature: hashgraph.SignerSignatureJSON) =>
                hashgraph.SignerSignature.fromJSON(signature)
        );
    }

    getAccountBalance(): Promise<hashgraph.AccountBalance> {
        return this.call(
            new hashgraph.AccountBalanceQuery().setAccountId(this.accountId)
        );
    }

    getAccountInfo(): Promise<hashgraph.AccountInfo> {
        return this.call(
            new hashgraph.AccountInfoQuery().setAccountId(this.accountId)
        );
    }

    getAccountRecords(): Promise<hashgraph.TransactionRecord[]> {
        return this.call(
            new hashgraph.AccountRecordsQuery().setAccountId(this.accountId)
        );
    }

    async signTransaction<T extends hashgraph.Transaction>(
        transaction: T
    ): Promise<T> {
        if (this.provider == null) {
            throw new Error(
                "cannot sign transaction with an wallet that doesn't contain a provider"
            );
        }

        let bytes = Buffer.from(transaction.toBytes());
        const response = await execute("/transaction/sign", {
            bytes: bytes.toString("hex"),
        });
        bytes = Buffer.from(response.response, "hex");

        return hashgraph.Transaction.fromBytes(bytes) as T;
    }

    checkTransaction<T extends hashgraph.Transaction>(
        transaction: T
    ): Promise<T> {
        const transactionId = transaction.transactionId;
        if (
            transactionId != null &&
            transactionId.accountId != null &&
            transactionId.accountId.compare(this.accountId) != 0
        ) {
            throw new Error(
                "transaction's ID constructed with a different account ID"
            );
        }

        if (this.provider == null) {
            return Promise.resolve(transaction);
        }

        const nodeAccountIds = (
            transaction.nodeAccountIds != null ? transaction.nodeAccountIds : []
        ).map((nodeAccountId) => nodeAccountId.toString());
        const network = Object.values(this.provider.getNetwork()).map(
            (nodeAccountId) => nodeAccountId.toString()
        );

        if (
            !nodeAccountIds.reduce(
                (previous, current) => previous && network.includes(current),
                true
            )
        ) {
            throw new Error(
                "Transaction already set node account IDs to values not within the current network"
            );
        }

        return Promise.resolve(transaction);
    }

    populateTransaction<T extends hashgraph.Transaction>(
        transaction: T
    ): Promise<T> {
        transaction.setTransactionId(
            hashgraph.TransactionId.generate(this.accountId)
        );

        if (this.provider == null) {
            throw new Error(
                "cannot set node account IDs with an wallet that doesn't contain a provider"
            );
        }

        const network = Object.values(this.provider.getNetwork()).map(
            (nodeAccountId) =>
                typeof nodeAccountId === "string"
                    ? hashgraph.AccountId.fromString(nodeAccountId)
                    : new hashgraph.AccountId(nodeAccountId)
        );
        transaction.setNodeAccountIds(network);
        return Promise.resolve(transaction);
    }

    call<RequestT, ResponseT, OutputT>(
        request: hashgraph.Executable<RequestT, ResponseT, OutputT>
    ): Promise<OutputT> {
        if (this.provider == null) {
            throw new Error(
                "cannot send request with an wallet that doesn't contain a provider"
            );
        }

        return this.provider.call(request);
    }
}