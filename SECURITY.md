# Security policy

Report vulnerabilities privately by email to nagarjunavs.dev@gmail.com rather than opening a public
issue. Include the affected version, a description, and reproduction steps if you have them.

This library performs no network calls and collects no data itself. It requests only the NFC
permission (Android) and, for the optional live tap test, the NFC Tag Reading entitlement (iOS).
The `CatalogRemoteApi`, analytics and logging seams are implemented by the host application.
