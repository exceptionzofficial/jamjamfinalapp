import { RESORT_DETAILS, numberToWords, formatBillDate, formatBillTime } from './billUtils';

export const printKOT = async (order) => {
    try {
        console.log('--- GENERATING KOT ---');
        const { tableNo, roomNo, items, orderType, timestamp } = order;

        const dateStr = formatBillDate(timestamp || new Date());
        const timeStr = formatBillTime(timestamp || new Date());

        // Format for console debugging
        let kotText = `
--------------------------------
      KITCHEN ORDER (KOT)      
--------------------------------
${RESORT_DETAILS.name}
--------------------------------
Type:  ${orderType === 'dining' ? 'DINING (Table ' + tableNo + ')' : 'ROOM SERVICE (' + (roomNo || 'N/A') + ')'}
Date:  ${dateStr}
Time:  ${timeStr}
--------------------------------
ITEM                    QTY
--------------------------------
${items.map(item => `${(item.name || 'Item').padEnd(23)} ${item.quantity.toString().padStart(4)}`).join('\n')}
--------------------------------
        TOTAL ITEMS: ${items.reduce((sum, item) => sum + item.quantity, 0)}
--------------------------------
\n\n\n`;

        console.log(kotText);
        console.log('--- KOT DELIVERY SUCCESSFUL (LOGGED TO CONSOLE) ---');

        return true;
    } catch (error) {
        console.error('KOT Formatting Error:', error);
        return false;
    }
};

/**
 * Generates and prints a full customer bill.
 */
export const printBill = async (order) => {
    try {
        console.log('--- GENERATING CUSTOMER BILL ---');
        const { customerName, items, totalAmount, subtotal, taxAmount, taxPercent, timestamp, tableNo, roomNo } = order;

        const dateStr = formatBillDate(timestamp || new Date());
        const timeStr = formatBillTime(timestamp || new Date());

        let billText = `
--------------------------------
${RESORT_DETAILS.name}
${RESORT_DETAILS.address}
GSTIN: ${RESORT_DETAILS.gstin}
Mob: ${RESORT_DETAILS.mobile}
--------------------------------
Bill No: ${order.billNo || 'N/A'}
Date: ${dateStr}
Time: ${timeStr}
To: ${customerName || 'Guest'}
${tableNo ? 'Table: ' + tableNo : roomNo ? 'Room: ' + roomNo : ''}
--------------------------------
ITEM            QTY   RATE    AMT
--------------------------------
${items.map(item => {
            const name = (item.name || 'Item').substring(0, 14).padEnd(14);
            const qty = item.quantity.toString().padStart(3);
            const rate = (item.price || 0).toString().padStart(6);
            const amt = (item.subtotal || 0).toString().padStart(6);
            return `${name} ${qty} ${rate} ${amt}`;
        }).join('\n')}
--------------------------------
SUBTOTAL:             ${subtotal.toString().padStart(10)}
TAX (${taxPercent}%):        ${taxAmount.toString().padStart(10)}
--------------------------------
TOTAL AMT:            ${totalAmount.toString().padStart(10)}.00
--------------------------------
${numberToWords(totalAmount)}
--------------------------------
    For ${RESORT_DETAILS.name}
--------------------------------
\n\n\n`;

        console.log(billText);
        console.log('--- BILL PRINT SUCCESSFUL (LOGGED TO CONSOLE) ---');
        return true;
    } catch (error) {
        console.error('Bill Printing Error:', error);
        return false;
    }
};

