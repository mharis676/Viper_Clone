# Online-order invoicing update

POS is removed from the application: its view, navigation entry, dashboard/header actions and F2 shortcut are gone. New Invoice opens customer-based sales invoicing; Invoices opens the sales register. Existing sale records and backup compatibility remain intact.

The invoice product card previously participated in flex shrinking inside a height-constrained dialog. Its overflow clipping could hide product rows and the add-line control. Modal sections now retain their content height and the modal body scrolls instead. The product section has an explicit title, product selector, Add Product and New Product actions. New Customer/Supplier can also be opened without closing the invoice. Nested dialogs handle focus only when they are the top dialog.

New product rows start with a product-selection prompt and focus the selector. Every line must select a product before save. Product saves display errors inline, use a larger generated SKU identifier, and accept fractional stock quantities.

Local checks: 44 accounting/offline tests passed; TypeScript, production web build and Android lint/APK/instrumentation compilation passed. New Android tests cover two successive product creations and billing both, repeated product lines with aggregate stock deductions, and creating a product without losing the open invoice. Device outcomes are recorded in the accompanying local logs; runtime tests run only on the dedicated emulator, never a physical phone.

The GitHub push workflow still builds only the APK; full tests remain manual. Push these source changes and use the newly built APK to receive the fix.

Final Android runtime result: all 7 instrumentation tests passed on the dedicated Android 16 emulator, including the three new product/billing tests, payment/return persistence, native print/share launch and portrait/landscape inset checks. A System UI startup ANR in the headless emulator was recovered by test setup; Viper ANRs are not dismissed. Product-picker screenshot: [verified Android invoice](bill-products-fixed.png).
