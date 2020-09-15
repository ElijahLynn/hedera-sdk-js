import AccountId from "./account/AccountId";
import Timestamp from "./Timestamp";
import proto from "@hashgraph/proto";
import TransactionReceipt from "./TransactionReceipt";
import TransactionReceiptQuery from "./TransactionReceiptQuery";
import TransactionRecord from "./TransactionRecord";
import TransactionRecordQuery from "./TransactionRecordQuery";

/**
 * The client-generated ID for a transaction.
 *
 * This is used for retrieving receipts and records for a transaction, for appending to a file
 * right after creating it, for instantiating a smart contract with bytecode in a file just created,
 * and internally by the network for detecting when duplicate transactions are submitted.
 */
export default class TransactionId {
    /**
     * @param {AccountId} accountId
     * @param {Timestamp} validStart
     */
    constructor(accountId, validStart) {
        /**
         * The Account ID that paid for this transaction.
         *
         * @readonly
         */
        this.accountId = accountId;

        /**
         * The time from when this transaction is valid.
         *
         * When a transaction is submitted there is additionally a validDuration (defaults to 120s)
         * and together they define a time window that a transaction may be processed in.
         *
         * @readonly
         */
        this.validStart = validStart;

        Object.freeze(this);
    }

    /**
     * Generates a new transaction ID for the given account ID.
     *
     * Note that transaction IDs are made of the valid start of the transaction and the account
     * that will be charged the transaction fees for the transaction.
     *
     * @param {AccountId | string} id
     * @returns {TransactionId}
     */
    static generate(id) {
        return new TransactionId(
            typeof id === "string" ? AccountId.fromString(id) : id,
            Timestamp.generate()
        );
    }

    /**
     * @param {string} id
     * @returns {TransactionId}
     */
    static fromString(id) {
        const [account, time] = id.split("@");
        const [seconds, nanos] = time.split(".").map(Number);

        return new TransactionId(
            AccountId.fromString(account),
            new Timestamp(seconds, nanos)
        );
    }

    /**
     * @returns {string}
     */
    toString() {
        return `${this.accountId.toString()}@${this.validStart.seconds}.${
            this.validStart.nanos
        }`;
    }

    /**
     * @template ChannelT
     * @param {import("./client/Client").default<ChannelT>} client
     * @returns {Promise<TransactionReceipt>}
     */
    getReceipt(client) {
        return new TransactionReceiptQuery()
            .setTransactionId(this)
            .execute(client);
    }

    /**
     * @template ChannelT
     * @param {import("./client/Client").default<ChannelT>} client
     * @returns {Promise<TransactionRecord>}
     */
    getRecord(client) {
        return new TransactionRecordQuery()
            .setTransactionId(this)
            .execute(client);
    }

    /**
     * @internal
     * @param {proto.ITransactionID} id
     * @returns {TransactionId}
     */
    static _fromProtobuf(id) {
        return new TransactionId(
            AccountId._fromProtobuf(
                /** @type {proto.IAccountID} */ (id.accountID)
            ),
            Timestamp._fromProtobuf(
                /** @type {proto.ITimestamp} */ (id.transactionValidStart)
            )
        );
    }

    /**
     * @internal
     * @returns {proto.ITransactionID}
     */
    _toProtobuf() {
        return {
            accountID: this.accountId._toProtobuf(),
            transactionValidStart: this.validStart._toProtobuf(),
        };
    }
}
