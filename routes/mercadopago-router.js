import express from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import userModel from '../models/user.model.js'; // Importamos el modelo para futuras referencias

const router = express.Router();

// 1. Configuración del Cliente de Mercado Pago
const accessToken = process.env.VITE_MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
    console.error('❌ ERROR CRÍTICO: No se encontró el Access Token de Mercado Pago en las variables de entorno.');
} else if (accessToken.startsWith('APP_USR-')) {
    console.warn('⚠️ ADVERTENCIA: Estás usando un Access Token de PRODUCCIÓN (APP_USR-).');
    console.warn('   Si tu cuenta no está validada o activada, Mercado Pago bloqueará la creación de preferencias (Error 403 PolicyAgent).');
    console.warn('   SOLUCIÓN: Usa un Access Token de PRUEBA que comience con "TEST-".');
} else if (accessToken.startsWith('TEST-')) {
    console.log('✅ Usando Access Token de PRUEBA (TEST-).');
}

const client = new MercadoPagoConfig({
    accessToken: accessToken
});

// 2. Endpoints

// A. POST /api/pagos/crear-premium
router.post('/crear-premium', async (req, res) => {
    try {
        // Obtener ID del usuario (Real o Simulado)
        const userId = req.user?.id || req.user?._id || 'TESTUSER5426194837088700544';

        // URLs de retorno
        const successUrl = process.env.VITE_MP_SUCCESS_URL || process.env.MP_SUCCESS_URL;
        const failureUrl = process.env.VITE_MP_FAILURE_URL || process.env.MP_FAILURE_URL;
        const notificationUrl = process.env.VITE_MP_NOTIFICATION_URL || process.env.MP_NOTIFICATION_URL;

        if (!notificationUrl) {
            console.error('⚠️ ADVERTENCIA: MP_NOTIFICATION_URL no está definida en el .env');
        }

        // Crear la instancia de Preferencia
        const preference = new Preference(client);

        // Construir el objeto de preferencia
        const preferenceBody = {
            items: [
                {
                    id: 'freelancer-premium',
                    title: 'Suscripción Freelancer Premium',
                    quantity: 1,
                    unit_price: 1000,
                    currency_id: 'ARS'
                }
            ],
            back_urls: {
                success: successUrl,
                failure: failureUrl,
                pending: failureUrl
            },
            auto_return: 'approved',
            external_reference: userId.toString(),
            statement_descriptor: 'CONECTAR PREMIUM'
        };

        // IMPORTANTE: Mercado Pago rechaza notification_url si es localhost.
        // Solo la agregamos si es una URL válida y pública.
        if (notificationUrl && !notificationUrl.includes('localhost')) {
            preferenceBody.notification_url = notificationUrl;
        } else {
            console.log('⚠️ Omitiendo notification_url para evitar error (es localhost).');
        }

        console.log('📦 Enviando preferencia a Mercado Pago:', JSON.stringify(preferenceBody, null, 2));

        // Crear la preferencia
        const result = await preference.create({ body: preferenceBody });

        // Responder con el link de pago (init_point)
        res.status(200).json({
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });

    } catch (error) {
        console.error('Error al crear preferencia de Mercado Pago:', error);
        res.status(500).json({ message: 'Error al iniciar el proceso de pago' });
    }
});

// B. POST /api/pagos/webhook
router.post('/webhook', async (req, res) => {
    try {
        const { query } = req;
        const topic = query.topic || query.type;
        const paymentId = query.id || query['data.id'];

        // Solo nos interesa el topic 'payment'
        if (topic === 'payment' && paymentId) {

            // Consultar el estado del pago en Mercado Pago
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });

            // Verificar si está aprobado
            if (paymentData.status === 'approved') {
                const userId = paymentData.external_reference;

                // --- LÓGICA DE NEGOCIO ---
                console.log('--------------------------------------------------');
                console.log(`💰 PAGO APROBADO: ${paymentId}`);
                console.log(`👤 ROL PREMIUM ACTIVADO para el usuario: ${userId}`);
                console.log('--------------------------------------------------');

                // Aquí iría la actualización real en base de datos:
                // await userModel.User.findByIdAndUpdate(userId, { plan: 'premium', role: 'freelancer' });
            }
        }

        // SIEMPRE responder 200 OK para que MP no reintente
        res.status(200).send('OK');

    } catch (error) {
        console.error('Error en Webhook de Mercado Pago:', error);
        // Aún en error, respondemos 200 o 500 según corresponda, 
        // pero para evitar bucles de reintentos infinitos si es un error de lógica nuestra, a veces conviene 200.
        // Por ahora devolvemos 500 si falla algo crítico.
        res.status(500).send('Error interno');
    }
});

export default router;
