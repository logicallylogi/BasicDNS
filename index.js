const dnsparse = require('dns-packet');
const dgram = require('dgram');

const dnsServer = dgram.createSocket('udp4');
const dnsPort = 53;
const dnsAddress = '0.0.0.0';

const blockedDomains = [
    'example.com',
    'example.org',
    'example.net'
];

dnsServer.on('message', (message, remote) => {
    // Parse the DNS message
    const request = dnsparse.decode(message);

    console.log(`${remote.address} requested ${request.questions[0].name}`)

    // Check if the domain is blocked
    const isBlocked = blockedDomains.includes(request.questions[0].name);

    // If the domain is blocked, return 0.0.0.0
    if (isBlocked) {
        const response = dnsparse.encode({
            id: request.id,
            type: 'response',
            flags: dnsparse.RECURSION_DESIRED,
            questions: request.questions,
            answers: [
                {
                    name: request.questions[0].name,
                    type: 'A',
                    class: 'IN',
                    ttl: 0,
                    data: '0.0.0.0'
                }
            ]
        });

        dnsServer.send(response, 0, response.length, remote.port, remote.address);
    } else {
        // Forward the request to another DNS server
        const dnsClient = dgram.createSocket('udp4');
        dnsClient.on('message', (response) => {
            dnsServer.send(response, 0, response.length, remote.port, remote.address);
            dnsClient.close();
        });

        dnsClient.send(message, 0, message.length, 53, '1.1.1.1');
    }
});

dnsServer.bind(dnsPort, dnsAddress);
