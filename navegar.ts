import * as cheerio from "https://esm.sh/cheerio"

function decode_onclick(input: string): { [key: string]: string } {
    // Regex para extrair os parâmetros dentro de jsfcljs()
    const regex = /jsfcljs\(document.getElementById\('([^']+)'\),\{([^\}]+)\},[^\)]+\)/;
    const match = input.match(regex);
    if (!match) {
        throw new Error("Não foi possível extrair os parâmetros da função onclick.");
    }

    // Extração do ID do formulário e dos parâmetros
    //const formId = match[1];
    const paramsString = match[2];

    // Dividir a string de parâmetros em pares chave-valor
    const paramsPairs = paramsString.split(',');
    const params: { [key: string]: string } = {};

    // Processar cada par chave-valor
    paramsPairs.forEach(pair => {
        const [key, value] = pair.split(':');
        const trimmedKey = key.trim().replace(/['"]/g, '');
        const trimmedValue = value.trim().replace(/['"]/g, '');
        params[trimmedKey] = trimmedValue;
    });

    return params;
}

function build_body_string(decoded: { [key: string]: string }, viewState: string) {
    const __id = decoded['id'];
    delete decoded['id'];
    const [key, value] = Object.entries(decoded)?.[0] ?? [];
    const submission = Object.assign(
        { id: __id },
        { [key]: key },
        { [`${key}:${value}`]: `${key}:${value}` }, {
        "javax.faces.ViewState": viewState,
    })
    return new URLSearchParams(submission).toString()
}

async function get_cookies() {
    // Faz a requisição para a URL especificada
    const response = await fetch("https://sigaa.ufpb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=14289031");

    const patterns = [/^_\d+/, /^JSESSIONID/]; // Padrões para os cookies desejados
    const cookies = (response.headers.get("set-cookie")!).split(', ');

    const foundCookies = cookies.map(cookie => {
        const parts = cookie.split(';')[0]; // Isola a parte de valor do cookie
        return patterns.find(pattern => parts.match(pattern)) ? parts : undefined;
    }).filter(Boolean); // Filtra undefined

    return foundCookies.join('; ');
}

function make_request(url: string, method: "POST", payload: string, cookies: string) {
    return fetch(url, {
        "headers": {
            "content-type": "application/x-www-form-urlencoded",
            origin: "https://sigaa.ufpb.br",
            referer: "https://sigaa.ufpb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=14289031",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "cookie": cookies,
        },
        "body": payload,
        "method": method
    });
}


async function explore() {
    //IMPORTANTE
    const cookies = await get_cookies();
    console.log(cookies)

    //carregar página de disciplinas
    const pagina_de_disciplinas = await (await fetch("https://sigaa.ufpb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=14289031")).text()
    const $ = cheerio.load(pagina_de_disciplinas);

    //IMPORTANTE
    const viewState = ($('input[name="javax.faces.ViewState"]'))[0].attribs.value

    const gatilhos = ($(`a[title="Visualizar Estrutura Curricular"]`)).toArray()

    const gatilho = (gatilhos[0]).attribs.onclick
    const decoded = decode_onclick(gatilho)

    const payload = build_body_string(decoded, viewState)

    const url = "https://sigaa.ufpb.br/sigaa/public/curso/curriculo.jsf;" + cookies.split(';').map(e => e.trim()).filter(e => e.startsWith("JSE")).reverse().join('; ');
    console.log(url)

    const response = await make_request(url, "POST", payload, cookies)

    console.log(await response.text())
}

explore()

/*
//IMPORTANTE
const cookies = await get_cookies();
console.log(cookies)
async function rec_explore(html: string, selector: string, base_url: string) {

    //carregar página de disciplinas
    const $ = cheerio.load(html);

    //IMPORTANTE
    const viewState = ($('input[name="javax.faces.ViewState"]'))[0].attribs.value

    //`a[title="Visualizar Estrutura Curricular"]`
    const gatilhos = $(selector).toArray()

    return await Promise.all((gatilhos as cheerio.Element[]).map(async (gatilho) => {
        const onclick = gatilho.attribs.onclick

        const decoded = decode_onclick(onclick)
        const payload = build_body_string(decoded, viewState)
        const url = base_url + ";" + cookies.split(';').map(e => e.trim()).filter(e => e.startsWith("JSE")).reverse().join('; ');
        const response = await make_request(url, "POST", payload, cookies)
        return { [selector]: await response.text() }
    }));

}

const html = await (await fetch("https://sigaa.ufpb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=14289031")).text()
rec_explore(html, `a[title="Visualizar Estrutura Curricular"]`, "https://sigaa.ufpb.br/sigaa/public/curso/curriculo.jsf")
*/