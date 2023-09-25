    document.getElementById('btnAddLink').addEventListener('click', async () => {
        const longUrl = document.getElementById('inputLongUrl').value;
        if (!longUrl) {
            alert('Please enter a URL to shorten.');
            return;
        }

        try {
            const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer 436c2bbdaae297e83eb190fdad5c50de0a8cba8e',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "long_url": longUrl,
                    "domain": "bit.ly",
                    "group_guid": "Ba1bc23dE4F"
                })
            });

            const data = await response.json();
            if (response.ok) {
                const table = document.getElementById('linksTable').getElementsByTagName('tbody')[0];
                const newRow = table.insertRow(table.rows.length);
                
                // Populate the row with data
                newRow.insertCell(0).innerText = data.id;
                newRow.insertCell(1).innerText = data.long_url;
                newRow.insertCell(2).innerText = data.link;
                newRow.insertCell(3).innerText = data.hits;
                newRow.insertCell(4).innerText = data.active;
                newRow.insertCell(5).innerText = data.created_at;
                newRow.insertCell(6).innerText = data.last_hit_at;
            } else {
                alert('Error shortening URL: ' + data.message);
            }
        } catch (error) {
            alert('An error occurred: ' + error.message);
        }
    });
