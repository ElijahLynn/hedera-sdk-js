import {
    Wallet,
    LocalProvider,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    if (
        process.env.OPERATOR_ID == null ||
        process.env.OPERATOR_KEY == null ||
        process.env.HEDERA_NETWORK == null
    ) {
        throw new Error(
            "Environment variables OPERATOR_ID, HEDERA_NETWORK, and OPERATOR_KEY are required."
        );
    }

    const wallet = new Wallet(
        process.env.OPERATOR_ID,
        process.env.OPERATOR_KEY,
        new LocalProvider()
    );

    try {
        // create topic
        let transaction = await new TopicCreateTransaction().freezeWithSigner(
            wallet
        );
        transaction = await transaction.signWithSigner(wallet);
        const createResponse = await transaction.executeWithSigner(wallet);
        const createReceipt = await createResponse.getReceiptWithSigner(wallet);

        console.log(`topic id = ${createReceipt.topicId.toString()}`);

        // send one message
        transaction = await new TopicMessageSubmitTransaction({
            topicId: createReceipt.topicId,
            message: "Hello World",
        }).freezeWithSigner(wallet);
        transaction = await transaction.signWithSigner(wallet);
        const sendResponse = await transaction.executeWithSigner(wallet);

        const sendReceipt = await sendResponse.getReceiptWithSigner(wallet);

        console.log(
            `topic sequence number = ${sendReceipt.topicSequenceNumber.toString()}`
        );
    } catch (error) {
        console.error(error);
    }
}

void main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
