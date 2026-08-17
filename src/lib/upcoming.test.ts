import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeUpcoming } from "./upcoming";

describe("mergeUpcoming", () => {
  it("sorts bills and EMIs together by due date", () => {
    const bills = [{ id: 1, name: "Netflix", amount: 199, dueDate: "2026-08-20" }];
    const emis = [
      {
        id: 1,
        name: "Car Loan",
        emiAmount: 12000,
        dueDate: "2026-08-18",
        installmentsPaid: 14,
        tenureMonths: 36,
      },
    ];

    const result = mergeUpcoming(bills, emis);
    assert.deepEqual(
      result.map((r) => r.kind),
      ["emi", "bill"],
    );
    assert.equal(result[0].dueDate, "2026-08-18");
  });

  it("carries EMI progress through, and a plain amount for bills", () => {
    const [emiItem] = mergeUpcoming(
      [],
      [{ id: 1, name: "Car Loan", emiAmount: 12000, dueDate: "2026-08-18", installmentsPaid: 14, tenureMonths: 36 }],
    );
    assert.equal(emiItem.kind, "emi");
    assert.equal(emiItem.amount, 12000);
    if (emiItem.kind === "emi") {
      assert.equal(emiItem.installmentsPaid, 14);
      assert.equal(emiItem.tenureMonths, 36);
    }
  });

  it("returns an empty list when nothing is upcoming", () => {
    assert.deepEqual(mergeUpcoming([], []), []);
  });
});
