import { MercadoPagoConfig, Preference } from "mercadopago";
import 'dotenv/config';


export const createPreference = async (req, res) => {
    try {
        const token = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.VITE_MERCADOPAGO_ACCESS_TOKEN;
        if (!token) {
            throw new Error("MERCADOPAGO_ACCESS_TOKEN is missing in environment variables.");
        }

        const client = new MercadoPagoConfig({
            accessToken: token
        });

        const { title, unit_price, quantity } = req.body;
        // Asumiendo que tenemos acceso al usuario autenticado via req.user o similar si usáramos middleware de auth
        // O podemos pasarlo en el body. Por seguridad, mejor usar el middleware de auth en la ruta.
        // Por ahora, usaremos un valor si viene en el body o un placeholder.
        const externalReference = req.body.userId || "unknown_user";

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        title: title || 'Premium - ConectAR-DEV',
                        unit_price: Number(unit_price) || 5000,
                        quantity: Number(quantity) || 1,
                        currency_id: 'ARS'
                    }
                ],
                back_urls: {
                    success: `${process.env.VITE_FRONTEND_URI || 'http://localhost:5173'}/dashboard?status=approved`,
                    failure: `${process.env.VITE_FRONTEND_URI || 'http://localhost:5173'}/free-to-premium?status=failure`,
                    pending: `${process.env.VITE_FRONTEND_URI || 'http://localhost:5173'}/free-to-premium?status=pending`
                },
                auto_return: "approved",
                external_reference: externalReference,
            }
        });

        res.status(200).json({ id: result.id });

    } catch (error) {
        console.error("Error al crear preferencia:", error);
        res.status(500).json({
            message: "Error al crear preferencia de pago",
            error: error.message,
            stack: error.stack,
            detail: error
        });
    }
};
