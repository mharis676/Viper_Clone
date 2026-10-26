import type { DatabaseSchema } from './schema.js';
/** Production phones start empty. Demo fixtures remain server/test-only. */
export function emptyDatabase(): DatabaseSchema {
  return {
    profile: { id:'business', name:'My Business', tradeName:'', gstin:'', phone:'', email:'', address:'', city:'', state:'', pincode:'', upiId:'', bankName:'', accountNumber:'', ifsc:'', termsAndConditions:'' },
    parties: [], items: [], transactions: [], expenses: [], ledgers: [], transfers: [], changeHistory: [],
    godowns: [{ id:'godown-1', name:'Main stock', location:'', isDefault:true }],
    expenseCategories: [{ id:'general', name:'General expense', type:'indirect' }],
    accounts: [{ id:'cash', name:'Cash in hand', type:'cash', balance:0, isDefault:true }, { id:'bank', name:'Bank account', type:'bank', balance:0, isDefault:true }],
    printSettings: { paperSize:'laser_a4', themeColor:'#C62828', companyLogo:true, signature:true, upiQr:false, taxBreakup:true, notesAndTerms:true },
  };
}
