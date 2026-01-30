/**
 * PrinterService.js
 * Handles KOT Printing for Kitchen Order Tickets.
 * Currently generates formatted KOT for console verification.
 * Bluetooth printing functionality can be added later with a stable library.
 */

export const printKOT = async (order) => {
    try {
        console.log('--- GENERATING KOT ---');
        const { tableNo, roomNo, items, orderType, timestamp } = order;

        const dateStr = new Date(timestamp || new Date()).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });

        // Format for console debugging
        let kotText = `
--------------------------------
      KITCHEN ORDER (KOT)      
--------------------------------
Type:  ${orderType === 'dining' ? 'DINING (Table ' + tableNo + ')' : 'ROOM SERVICE (' + (roomNo || 'N/A') + ')'}
Time:  ${dateStr}
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
