// Payment Gateway — Razorpay Checkout, replacing the old free "demo" Upgrade
// button (activatePro() in js/01-core/02-navigation-auth.js, which is left
// untouched — it's now unused by the real button but harmless to leave in
// place). Needs functions/index.js's createRazorpayOrder / verifyRazorpayPayment
// deployed, and Razorpay's checkout.js script tag added to index.html.
//
// SETUP: paste your Razorpay Key ID (the public one, NOT the secret) below —
// get it from Razorpay Dashboard -> Settings -> API Keys, same place you got
// the Key ID/Secret you already put into Firebase Secrets for functions/index.js.

    async function startProUpgrade() {
        if (!currentUser) return showToast('Login required!', 'error');
        if (typeof Razorpay === 'undefined') {
            return showToast('Payment library still loading — try again in a moment.', 'error');
        }
        try {
            showToast('Preparing checkout…', 'info');
            const createOrder = firebase.functions().httpsCallable('createRazorpayOrder');
            const result = await createOrder();
            const { orderId, amount, currency, keyId } = result.data;
            if (!orderId || !keyId || !Number.isFinite(amount) || !currency) {
                throw new Error('The payment service returned an incomplete order.');
            }

            const rzp = new Razorpay({
                key: keyId,
                order_id: orderId,
                amount, currency,
                name: 'Master Reminder App',
                description: 'Pro Upgrade — 1 year',
                prefill: { email: currentUser.email },
                theme: { color: '#ff9500' },
                handler: async function (response) {
                    await verifyProPayment(response);
                },
                modal: { ondismiss: function () { showToast('Checkout closed', 'info'); } }
            });
            rzp.open();
        } catch (e) { showToast('Checkout error: ' + e.message, 'error'); }
    }

    async function verifyProPayment(razorpayResponse) {
        try {
            showToast('Verifying payment…', 'info');
            const verify = firebase.functions().httpsCallable('verifyRazorpayPayment');
            const result = await verify({
                orderId: razorpayResponse.razorpay_order_id,
                paymentId: razorpayResponse.razorpay_payment_id,
                signature: razorpayResponse.razorpay_signature
            });
            if (result.data.success) {
                isProUser = true;
                localStorage.setItem('isPro', 'true');
                localStorage.setItem('proExpiresAt', result.data.proExpiresAt);
                const pb = document.getElementById('proBadgeDisplay');
                if (pb) pb.style.display = 'inline-flex';
                closeModal('proModal');
                showToast('Welcome to PRO! 🎉', 'success');
                if (typeof renderSubscriptionPage === 'function') renderSubscriptionPage();
            }
        } catch (e) { showToast('Payment verification failed: ' + e.message, 'error'); }
    }
