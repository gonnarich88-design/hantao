
import { Member, Item, BillConfig, MemberSummary, Transfer, Receipt } from '../types';

export const calculateSummary = (
  members: Member[],
  items: Item[],
  receipts: Receipt[],
  config: BillConfig
): { summaries: MemberSummary[], transfers: Transfer[] } => {
  const summaryMap = new Map<string, MemberSummary>();
  
  members.forEach((member) => {
    summaryMap.set(member.id, {
      memberId: member.id,
      memberName: member.name,
      baseConsumption: 0,
      serviceChargeShare: 0,
      vatShare: 0,
      totalConsumption: 0,
      totalPaid: 0,
      netBalance: 0,
      items: [],
    });
  });

  const defaultPayerId = members.find(m => m.isPayer)?.id || members[0]?.id;
  const receiptMemberConsumption = new Map<string, Map<string, number>>();
  const receiptCalculatedTotals = new Map<string, number>();
  const receiptSubtotals = new Map<string, number>();

  receipts.forEach(r => {
      receiptMemberConsumption.set(r.id, new Map<string, number>());
      receiptCalculatedTotals.set(r.id, 0);
      receiptSubtotals.set(r.id, 0);
  });
  
  const uncategorizedConsumption = new Map<string, number>();

  items.forEach((item) => {
    const receipt = receipts.find(r => r.id === item.receiptId);
    
    let receiptScRate = (receipt?.excludeServiceCharge) ? 0 : (receipt?.scRate ?? 0);
    let receiptVatRate = (receipt?.excludeVat) ? 0 : (receipt?.vatRate ?? 0);

    let scRate = item.excludeServiceCharge ? 0 : receiptScRate;
    let vatRate = item.excludeVat ? 0 : receiptVatRate;

    // Calculate Full Costs (Line Total)
    const lineBaseCost = item.price * item.quantity;
    const lineSCAmount = lineBaseCost * (scRate / 100);
    const lineVatBase = lineBaseCost + lineSCAmount;
    const lineVatAmount = lineVatBase * (vatRate / 100);
    const lineTotalCost = lineBaseCost + lineSCAmount + lineVatAmount;

    // 1. Handle Payer (Who paid for this item initially)
    const payerId = item.paidBy || defaultPayerId;
    if (summaryMap.has(payerId)) {
        summaryMap.get(payerId)!.totalPaid += lineTotalCost;
    }

    // Prepare consumption tracking maps
    const rid = item.receiptId;
    const targetMap = (rid && receiptMemberConsumption.has(rid)) 
        ? receiptMemberConsumption.get(rid)! 
        : uncategorizedConsumption;

    // 2. Handle Fixed Deductions (Explicit Amounts) first
    let remainingTotalCost = lineTotalCost;
    let remainingBaseCost = lineBaseCost;
    let remainingSC = lineSCAmount;
    let remainingVAT = lineVatAmount;

    if (item.fixedDeductions && item.fixedDeductions.length > 0) {
        item.fixedDeductions.forEach(deduction => {
            const memberId = deduction.memberId;
            const amount = deduction.amount; // Net amount user wants to pay

            if (amount > 0 && summaryMap.has(memberId)) {
                // Calculate proportional base/sc/vat for this fixed amount for reporting
                // Ratio = Amount / LineTotalCost
                const ratio = lineTotalCost > 0 ? (amount / lineTotalCost) : 0;
                const fixedBase = lineBaseCost * ratio;
                const fixedSC = lineSCAmount * ratio;
                const fixedVAT = lineVatAmount * ratio;

                const stats = summaryMap.get(memberId)!;
                stats.baseConsumption += fixedBase;
                stats.serviceChargeShare += fixedSC;
                stats.vatShare += fixedVAT;
                stats.totalConsumption += amount;
                
                stats.items.push({
                    name: `${item.name} (ระบุยอด)`,
                    share: amount
                });

                // Update Remaining
                remainingTotalCost -= amount;
                remainingBaseCost -= fixedBase;
                remainingSC -= fixedSC;
                remainingVAT -= fixedVAT;

                // Track for receipt totals
                const current = targetMap.get(memberId) || 0;
                targetMap.set(memberId, current + amount);
                
                if (rid) {
                    receiptCalculatedTotals.set(rid, (receiptCalculatedTotals.get(rid) || 0) + amount);
                    receiptSubtotals.set(rid, (receiptSubtotals.get(rid) || 0) + fixedBase);
                }
            }
        });
    }

    // 3. Handle Remaining Split (Weighted/Shared or Unit)
    // Prevent negative remaining cost if fixed deductions > total
    if (remainingTotalCost < 0) remainingTotalCost = 0;

    const totalAssignedShares = item.assignedMemberIds.length;

    if (totalAssignedShares > 0) {
        // Calculate Cost Per Share based on REMAINING amount
        let costPerShare, basePerShare, scPerShare, vatPerShare;
        let isSharingMode = false;

        // MODE A: Sharing / Split (Assigned members > Quantity) OR partial assignment treated as shares
        // In "Fixed Deduction" context, we treat assignedMemberIds as "Shares" to distribute the remainder.
        // If strict unit mode logic is preferred for remainder, it gets complex. 
        // Here we assume: If fixed deductions exist, the rest is shared by weight.
        // If no fixed deductions, we keep the original logic (Unit vs Share).
        
        const hasFixed = item.fixedDeductions && item.fixedDeductions.length > 0;

        if (hasFixed || totalAssignedShares > item.quantity) {
             isSharingMode = true;
             // Distribute Remainder Equally among Shares
             costPerShare = remainingTotalCost / totalAssignedShares;
             basePerShare = remainingBaseCost / totalAssignedShares;
             scPerShare = remainingSC / totalAssignedShares;
             vatPerShare = remainingVAT / totalAssignedShares;
        } 
        else {
             // MODE B: Unit Assignment (Assigned members <= Quantity) -> Potential Remainder
             // Original logic for pure unit assignment
             // Unit Cost needs to be recalculated based on Remaining? 
             // actually if it's Unit mode but we have fixed deductions, it implies hybrid.
             // Simplest approach: Treat remainder as "Unit Cost" is tricky.
             // Fallback: If no fixed deductions, standard unit cost.
             const scAmountPerUnit = item.price * (scRate / 100);
             const vatBasePerUnit = item.price + scAmountPerUnit;
             const vatAmountPerUnit = vatBasePerUnit * (vatRate / 100);
             const unitTotalCost = item.price + scAmountPerUnit + vatAmountPerUnit;
             
             costPerShare = unitTotalCost;
             basePerShare = item.price;
             scPerShare = scAmountPerUnit;
             vatPerShare = vatAmountPerUnit;
        }

        const memberUnitCount = new Map<string, number>();
        item.assignedMemberIds.forEach(id => memberUnitCount.set(id, (memberUnitCount.get(id) || 0) + 1));

        if (rid) {
            const assignedTotalCost = costPerShare * totalAssignedShares;
            receiptCalculatedTotals.set(rid, (receiptCalculatedTotals.get(rid) || 0) + assignedTotalCost);
            
            const assignedSubtotal = basePerShare * totalAssignedShares;
            receiptSubtotals.set(rid, (receiptSubtotals.get(rid) || 0) + assignedSubtotal);
        }

        memberUnitCount.forEach((units, memberId) => {
            const stats = summaryMap.get(memberId);
            if (stats) {
                const memberTotalConsumption = costPerShare * units;
                stats.baseConsumption += basePerShare * units;
                stats.serviceChargeShare += scPerShare * units;
                stats.vatShare += vatPerShare * units;
                stats.totalConsumption += memberTotalConsumption;

                stats.items.push({
                    name: units > 1 ? `${item.name} (${hasFixed ? 'ส่วนแบ่ง' : ''} x${units})` : item.name,
                    share: memberTotalConsumption
                });

                const current = targetMap.get(memberId) || 0;
                targetMap.set(memberId, current + memberTotalConsumption);
            }
        });

        // HANDLE REMAINDER (Only for Unit Mode without fixed deductions, or if shares don't cover full remainder)
        // If we are in sharing mode (hasFixed or assigned > qty), 'remainingTotalCost' is fully distributed by definition of division.
        // The only remainder is if isSharingMode is FALSE, meaning we are assigning Units, and Units < Quantity.
        if (!isSharingMode && totalAssignedShares < item.quantity) {
             // Standard Unit Mode Remainder
            const scAmountPerUnit = item.price * (scRate / 100);
            const vatBasePerUnit = item.price + scAmountPerUnit;
            const vatAmountPerUnit = vatBasePerUnit * (vatRate / 100);
            const unitTotalCost = item.price + scAmountPerUnit + vatAmountPerUnit;

            const remainingUnits = item.quantity - totalAssignedShares;
            const remainderBase = item.price * remainingUnits;
            const remainderSC = scAmountPerUnit * remainingUnits;
            const remainderVAT = vatAmountPerUnit * remainingUnits;
            const remainderTotal = unitTotalCost * remainingUnits;

            const stats = summaryMap.get(payerId);
            if (stats) {
                stats.baseConsumption += remainderBase;
                stats.serviceChargeShare += remainderSC;
                stats.vatShare += remainderVAT;
                stats.totalConsumption += remainderTotal;
                stats.items.push({
                    name: `${item.name} (เหลือ x${remainingUnits})`,
                    share: remainderTotal
                });
                const current = targetMap.get(payerId) || 0;
                targetMap.set(payerId, current + remainderTotal);
            }
            if (rid) {
                receiptCalculatedTotals.set(rid, (receiptCalculatedTotals.get(rid) || 0) + remainderTotal);
                receiptSubtotals.set(rid, (receiptSubtotals.get(rid) || 0) + remainderBase);
            }
        }

    } else {
        // CASE: TOTALLY UNASSIGNED -> Assign Remaining to Payer
        // (If fixed deductions existed, this assigns the REST to payer)
        if (remainingTotalCost > 0.0001) {
            const stats = summaryMap.get(payerId);
            if (stats) {
                stats.baseConsumption += remainingBaseCost;
                stats.serviceChargeShare += remainingSC;
                stats.vatShare += remainingVAT;
                stats.totalConsumption += remainingTotalCost;
                stats.items.push({
                    name: `${item.name} (ยังไม่ระบุ)`,
                    share: remainingTotalCost
                });
                const current = targetMap.get(payerId) || 0;
                targetMap.set(payerId, current + remainingTotalCost);
            }
            if (rid) {
                receiptCalculatedTotals.set(rid, (receiptCalculatedTotals.get(rid) || 0) + remainingTotalCost);
                receiptSubtotals.set(rid, (receiptSubtotals.get(rid) || 0) + remainingBaseCost);
            }
        }
    }
  });

  // Apply Discount & Rounding
  receipts.forEach(receipt => {
      const discountValue = receipt.discountValue || 0;
      
      const receiptItems = items.filter(i => i.receiptId === receipt.id);
      const payerGrossMap = new Map<string, number>();
      let receiptGrossTotalWithTax = 0;
      let receiptGrossForDiscountBase = 0;

      const receiptScRate = (receipt.excludeServiceCharge) ? 0 : (receipt.scRate ?? 0);
      const receiptVatRate = (receipt.excludeVat) ? 0 : (receipt.vatRate ?? 0);

      receiptItems.forEach(item => {
          const scRate = item.excludeServiceCharge ? 0 : receiptScRate;
          const vatRate = item.excludeVat ? 0 : receiptVatRate;
          
          const unitPrice = item.price;
          const qty = item.quantity;
          const baseTotal = unitPrice * qty;
          
          const sc = baseTotal * (scRate/100);
          const vat = (baseTotal + sc) * (vatRate/100);
          const lineTotal = baseTotal + sc + vat;
          
          receiptGrossForDiscountBase += baseTotal;
          receiptGrossTotalWithTax += lineTotal;
          
          const pid = item.paidBy || defaultPayerId;
          payerGrossMap.set(pid, (payerGrossMap.get(pid) || 0) + lineTotal);
      });

      if (discountValue > 0 && receiptGrossTotalWithTax > 0) {
          let discountBaseAmount = 0;
          if (receipt.discountType === 'percent') {
               discountBaseAmount = receiptGrossForDiscountBase * (discountValue / 100);
          } else {
               discountBaseAmount = discountValue;
          }
          
          const savingSC = discountBaseAmount * (receiptScRate / 100);
          const savingVAT = (discountBaseAmount + savingSC) * (receiptVatRate / 100);
          const totalSaving = discountBaseAmount + savingSC + savingVAT;
          
          // 1. Adjust Consumers (Reduce Consumption)
          const consumers = receiptMemberConsumption.get(receipt.id);
          const totalConsumptionRecorded = receiptCalculatedTotals.get(receipt.id) || 0;
          if (consumers && totalConsumptionRecorded > 0) {
              consumers.forEach((consumptionAmount, memberId) => {
                  const stats = summaryMap.get(memberId);
                  if (stats) {
                      const ratio = consumptionAmount / totalConsumptionRecorded;
                      const memberSaving = totalSaving * ratio;
                      stats.totalConsumption -= memberSaving;
                      stats.items.push({ name: `ส่วนลด (${receipt.name})`, share: -memberSaving });
                  }
              });
              receiptCalculatedTotals.set(receipt.id, totalConsumptionRecorded - totalSaving);
          }

          // 2. Adjust Payers (Reduce Total Paid)
          payerGrossMap.forEach((grossPaid, payerId) => {
               const stats = summaryMap.get(payerId);
               if (stats) {
                   const ratio = grossPaid / receiptGrossTotalWithTax;
                   const payerSaving = totalSaving * ratio;
                   stats.totalPaid -= payerSaving; 
               }
           });
      }
  });

  receipts.forEach(receipt => {
      if (receipt.manualTotal != null) {
          const calculated = receiptCalculatedTotals.get(receipt.id) || 0;
          const diff = receipt.manualTotal - calculated;
          if (Math.abs(diff) > 0.0001) {
              const consumers = receiptMemberConsumption.get(receipt.id);
              if (consumers && consumers.size > 0) {
                  const share = diff / consumers.size;
                  consumers.forEach((_, memberId) => {
                      const stats = summaryMap.get(memberId);
                      if (stats) {
                          stats.totalConsumption += share;
                          stats.items.push({ name: `Rounding (${receipt.name})`, share: share });
                      }
                  });
                  
                  // Identify dominant payer to adjust their Total Paid
                  const receiptItems = items.filter(i => i.receiptId === receipt.id);
                  const payerCounts = new Map<string, number>();
                  receiptItems.forEach(i => {
                         const pid = i.paidBy || defaultPayerId;
                         payerCounts.set(pid, (payerCounts.get(pid)||0) + (i.price * i.quantity));
                  });
                  
                  let maxPayer = defaultPayerId;
                  let maxAmt = -1;
                  payerCounts.forEach((amt, pid) => { if (amt > maxAmt) { maxAmt = amt; maxPayer = pid; } });

                  const payerStats = summaryMap.get(maxPayer);
                  if (payerStats) payerStats.totalPaid += diff; 
              }
          }
      }
  });

  const summaries: MemberSummary[] = [];
  summaryMap.forEach((stats) => {
    stats.netBalance = stats.totalPaid - stats.totalConsumption;
    summaries.push(stats);
  });

  return { summaries, transfers: calculateTransfers(summaries) };
};

const calculateTransfers = (summaries: MemberSummary[]): Transfer[] => {
    const transfers: Transfer[] = [];
    let debtors = summaries.filter(s => s.netBalance < -0.01).map(s => ({ ...s, netBalance: s.netBalance })).sort((a, b) => a.netBalance - b.netBalance);
    let creditors = summaries.filter(s => s.netBalance > 0.01).map(s => ({ ...s, netBalance: s.netBalance })).sort((a, b) => b.netBalance - a.netBalance);
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i], creditor = creditors[j];
        const amount = Math.min(Math.abs(debtor.netBalance), creditor.netBalance);
        if (amount > 0) transfers.push({ fromId: debtor.memberId, fromName: debtor.memberName, toId: creditor.memberId, toName: creditor.memberName, amount: amount });
        debtor.netBalance += amount; creditor.netBalance -= amount;
        if (Math.abs(debtor.netBalance) < 0.01) i++;
        if (creditor.netBalance < 0.01) j++;
    }
    return transfers;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};
