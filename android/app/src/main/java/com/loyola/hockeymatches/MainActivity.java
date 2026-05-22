package com.loyola.hockeymatches;

import android.os.Bundle;
import java.security.cert.CertificateException;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public class MainActivity extends com.getcapacitor.BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // ADVERTENCIA: Este código desactiva la validación de certificados y hostname en TODAS las conexiones HTTPS.
        // Úsalo solo para desarrollo, nunca en producción. Expone la app a ataques MITM.
        try {
            TrustManager[] trustAllCerts = new TrustManager[]{
                new X509TrustManager() {
                    // No se valida ningún certificado. Solo para desarrollo.
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() { return new java.security.cert.X509Certificate[]{}; }
                    public void checkClientTrusted(java.security.cert.X509Certificate[] certs, String authType) throws CertificateException {
                        // Intencionadamente vacío: se acepta cualquier certificado.
                    }
                    public void checkServerTrusted(java.security.cert.X509Certificate[] certs, String authType) throws CertificateException {
                        // Intencionadamente vacío: se acepta cualquier certificado.
                    }
                }
            };
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
