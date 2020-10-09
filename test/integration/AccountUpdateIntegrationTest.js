import AccountCreateTransaction from "../src/account/AccountCreateTransaction";
import AccountDeleteTransaction from "../src/account/AccountDeleteTransaction";
import AccountUpdateTransaction from "../src/account/AccountUpdateTransaction";
import AccountInfoQuery from "../src/account/AccountInfoQuery";
import Hbar from "../src/Hbar";
import TransactionId from "../../src/transaction/TransactionId";
import newClient from "./client";
import { PrivateKey } from "../src/index";
import Long from "long";

describe("AccountUpdate", function () {
    it("should be executable", async function () {
        this.timeout(10000);

        const client = newClient();
        const operatorId = client.operatorAccountId;

        const key1 = PrivateKey.generate();
        const key2 = PrivateKey.generate();

        let response = await new AccountCreateTransaction()
            .setKey(key1.publicKey)
            .setMaxTransactionFee(new Hbar(2))
            .setInitialBalance(new Hbar(1))
            .execute(client);

        const receipt = await response.getReceipt(client);

        expect(receipt.accountId).to.not.be.null;
        const account = receipt.accountId;

        let info = await new AccountInfoQuery()
            .setNodeAccountId(response.nodeId)
            .setAccountId(account)
            .execute(client);

        expect(info.accountId.toString()).to.be.equal(account.toString());
        expect(info.isDeleted).to.be.false;
        expect(info.key.toString()).to.be.equal(key1.publicKey.toString());
        expect(info.balance.toTinybars().toInt()).to.be.equal(
            new Hbar(1).toTinybars().toInt()
        );
        expect(info.autoRenewPeriod.toInt()).to.be.equal(7776000);
        expect(info.receiveRecordThreshold.toTinybars().toInt()).to.be.equal(
            Long.MAX_VALUE.toInt()
        );
        expect(info.sendRecordThreshold.toTinybars().toInt()).to.be.equal(
            Long.MAX_VALUE.toInt()
        );
        expect(info.proxyAccountId).to.be.null;
        expect(info.proxyReceived.toTinybars().toInt()).to.be.equal(0);

        response = await (
            await (
                await new AccountUpdateTransaction()
                    .setNodeAccountId(response.nodeId)
                    .setAccountId(account)
                    .setMaxTransactionFee(new Hbar(1))
                    .setKey(key2.publicKey)
                    .setMaxTransactionFee(new Hbar(1))
                    .freezeWith(client)
                    .sign(key1)
            ).sign(key2)
        ).execute(client);

        await response.getReceipt(client);

        info = await new AccountInfoQuery()
            .setNodeAccountId(response.nodeId)
            .setAccountId(account)
            .execute(client);

        expect(info.accountId.toString()).to.be.equal(account.toString());
        expect(info.isDeleted).to.be.false;
        expect(info.key.toString()).to.be.equal(key2.publicKey.toString());
        expect(info.balance.toTinybars().toInt()).to.be.equal(
            new Hbar(1).toTinybars().toInt()
        );
        expect(info.autoRenewPeriod.toInt()).to.be.equal(7776000);
        expect(info.receiveRecordThreshold.toTinybars().toInt()).to.be.equal(
            Long.MAX_VALUE.toInt()
        );
        expect(info.sendRecordThreshold.toTinybars().toInt()).to.be.equal(
            Long.MAX_VALUE.toInt()
        );
        expect(info.proxyAccountId).to.be.null;
        expect(info.proxyReceived.toTinybars().toInt()).to.be.equal(0);

        await (
            await (
                await new AccountDeleteTransaction()
                    .setAccountId(account)
                    .setMaxTransactionFee(new Hbar(1))
                    .setNodeAccountId(response.nodeId)
                    .setTransferAccountId(operatorId)
                    .setTransactionId(TransactionId.generate(account))
                    .freezeWith(client)
                    .sign(key2)
            ).execute(client)
        ).getReceipt(client);
    });
});