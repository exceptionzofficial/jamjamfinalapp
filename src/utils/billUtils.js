/**
 * billUtils.js
 * Shared utilities for bill generation and formatting.
 */

export const RESORT_DETAILS = {
    name: 'SRI KALKI JAM JAM RESORTS',
    address: '17/A, Kalki Nagar, Velampalayam, Kavundapadi, Erode - 638455. Tamil Nadu.',
    gstin: '33AFBFS6465F1ZZ',
    mobile: '9442917999',
    email: 'srikalkijamjamresorts@gmail.com',
    website: 'www.srikalkijamjamresorts.com',
    state: 'Tamil Nadu',
    stateCode: '33'
};

/**
 * Converts a number into English words for currency representation.
 * @param {number} amount 
 * @returns {string}
 */
export const numberToWords = (amount) => {
    if (amount === 0) return 'Zero Only';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (num) => {
        if (num < 20) return units[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + units[num % 10] : '');
        if (num < 1000) return units[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' And ' + convert(num % 100) : '');
        if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convert(num % 1000) : '');
        if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convert(num % 100000) : '');
        return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convert(num % 10000000) : '');
    };

    return convert(Math.floor(amount)) + ' Only';
};

/**
 * Formats a date for the bill.
 */
export const formatBillDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Formats time for the bill.
 */
export const formatBillTime = (date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Formats a given number into the standard bill No format.
 */
export const formatBillNo = (prefix, number) => {
    return `${prefix}-${number}`;
};
