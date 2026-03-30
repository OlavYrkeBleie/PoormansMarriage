import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface AccessInfo {
  port: number;
  lanAddresses: string[];
  lanUrls: string[];
  preferredUrl: string;
}

export function PhoneSettings() {
  const [info, setInfo] = useState<AccessInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.get<AccessInfo>("/api/access").then(setInfo).catch(() => {});
  }, []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="panel-header">Open on your phone</div>
        <div className="card-body space-y-3 text-sm">
          <p>
            Your phone and this machine need to be on the same Wi-Fi. Point the phone
            browser at one of the URLs below and log in. Then add the page to the home
            screen so the camera capture flow opens with one tap.
          </p>

          {!info && <div className="text-muted">Loading network info...</div>}

          {info && info.lanUrls.length === 0 && (
            <div className="text-muted">
              No LAN IP detected. Make sure you are connected to Wi-Fi (not just cellular
              or a VPN). Restart the app after connecting.
            </div>
          )}

          {info && info.lanUrls.length > 0 && (
            <div className="space-y-2">
              {info.lanUrls.map((url) => (
                <div key={url} className="flex items-center gap-2">
                  <code className="px-2 py-1 text-xs" style={{ background: "rgb(var(--bg))", border: "1px solid rgb(var(--border))" }}>
                    {url}
                  </code>
                  <button className="btn-ghost text-xxs" onClick={() => copy(url)}>
                    {copied === url ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
              <div className="pt-3">
                <div className="label">Scan this with the phone camera</div>
                <img
                  src={`/api/access/qr?url=${encodeURIComponent(info.preferredUrl)}`}
                  alt="QR code"
                  className="bg-white p-3"
                  style={{ width: 220, height: 220, border: "1px solid rgb(var(--border))" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="panel-header">On the phone</div>
        <div className="card-body text-sm space-y-2">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open the URL above in Safari (iOS) or Chrome (Android).</li>
            <li>Sign in with the same account you use here.</li>
            <li>
              iOS: tap Share, then "Add to Home Screen". Android: the browser will
              offer an "Install app" option.
            </li>
            <li>Name it "Add Receipt". The home-screen icon opens straight on the camera screen.</li>
          </ol>
          <p className="text-muted text-xxs">
            If nothing connects, the machine's firewall is probably blocking inbound
            port {info?.port ?? 3100}. Allow it for the private network only.
          </p>
        </div>
      </div>
    </div>
  );
}
