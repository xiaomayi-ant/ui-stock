"use client";

import { TransactionConfirmationPending } from "./transaction-confirmation-pending";
import { TransactionConfirmationFinal } from "./transaction-confirmation-final";
import { makeAssistantToolUI, useThreadContext } from "@assistant-ui/react";
import { updateState } from "@/lib/chatApi";

type PurchaseStockArgs = {
  ticker: string;
  companyName: string;
  quantity: number;
  maxPurchasePrice: number;
};

type PurchaseStockResult = {
  approve?: boolean;
  cancelled?: boolean;
  error?: string;
};

export const PurchaseStockTool = makeAssistantToolUI<PurchaseStockArgs, string>(
  {
    toolName: "purchase_stock",
    render: function PurchaseStockUI({
      part: { args, result },
      status,
      addResult,
    }) {
      let resultObj: PurchaseStockResult;
      try {
        resultObj = result ? JSON.parse(result) : {};
      } catch (e) {
        resultObj = { error: result! };
      }

      const handleReject = () => {
        addResult({ cancelled: true });
      };

      const handleConfirm = async () => {
        addResult({ approve: true });
      };

      return (
        <div className="mb-4 flex flex-col items-center gap-2">
          <div>
            <pre className="whitespace-pre-wrap break-all text-center">
              purchase_stock({JSON.stringify(args)})
            </pre>
          </div>
          {!result && status.type !== "running" && (
            <TransactionConfirmationPending
              {...args}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          )}
          {resultObj.approve && <TransactionConfirmationFinal {...args} />}
          {resultObj.approve === false && (
            <pre className="font-bold text-red-600">User rejected purchase</pre>
          )}
          {resultObj.cancelled && (
            <pre className="font-bold text-red-600">Cancelled</pre>
          )}
        </div>
      );
    },
  }
);
