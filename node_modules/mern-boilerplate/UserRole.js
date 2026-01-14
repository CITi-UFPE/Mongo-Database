// userUtils.js

const userRolesData = [
  { "cargo": "Gerente de Comercial", "area": "Comercial", "login_atlas": "gcom_atlas_login", "email": "niltton.szpak@citi.org.br" },
  { "cargo": "Gerente de Contas-Chaves", "area": "Comercial", "login_atlas": "gchave_atlas_login", "email": "sabrina.cardoso@citi.org.br" },
  { "cargo": "Gerente de Conta", "area": "Comercial", "login_atlas": "gconta_atlas_login", "email": "gerente.conta@empresa.com" },
  { "cargo": "Líder de Dados", "area": "Dados", "login_atlas": "lidat_atlas_login", "email": "lider.dados@empresa.com" },
  { "cargo": "Gerente de Dados", "area": "Dados", "login_atlas": "gdat_atlas_login", "email": "gerente.dados@empresa.com" },
  { "cargo": "Analista de Dados", "area": "Dados", "login_atlas": "anat_atlas_login", "email": "analista.dados@empresa.com" },
  { "cargo": "Diretor(a) Executivo(a) Principal (CEO)", "area": "Executivo", "login_atlas": "ceo_atlas_login", "email": "ceo@empresa.com" },
  { "cargo": "Diretor(a) de Tecnologia (CTO)", "area": "Executivo", "login_atlas": "cto_atlas_login", "email": "cto@empresa.com" },
  { "cargo": "Diretor(a) de Receitas (CRO)", "area": "Executivo", "login_atlas": "cro_atlas_login", "email": "cro@empresa.com" },
  { "cargo": "Diretor(a) de Operações (COO)", "area": "Executivo", "login_atlas": "coo_atlas_login", "email": "coo@empresa.com" },
  { "cargo": "Gerente de Marketing", "area": "Marketing", "login_atlas": "gmarkt_atlas_login", "email": "gerente.marketing@empresa.com" },
  { "cargo": "Especialista em Branding", "area": "Marketing", "login_atlas": "brand_atlas_login", "email": "especialista.branding@empresa.com" },
  { "cargo": "Analista de Marketing", "area": "Marketing", "login_atlas": "amarkt_atlas_login", "email": "analista.marketing@empresa.com" },
  { "cargo": "Líder de Design", "area": "Design", "login_atlas": "lides_atlas_login", "email": "lider.design@empresa.com" },
  { "cargo": "Gerente de Produtos", "area": "Design", "login_atlas": "gprod_atlas_login", "email": "gerente.produtos@empresa.com" },
  { "cargo": "Designer de Produtos", "area": "Design", "login_atlas": "dprod_atlas_login", "email": "designer.produtos@empresa.com" },
  { "cargo": "Líder de Desenvolvimento", "area": "Desenvolvimento", "login_atlas": "lidev_atlas_login", "email": "lider.dev@empresa.com" },
  { "cargo": "Gerente de Software", "area": "Desenvolvimento", "login_atlas": "gsoft_atlas_login", "email": "gerente.software@empresa.com" },
  { "cargo": "Pessoa Desenvolvedora", "area": "Desenvolvimento", "login_atlas": "dev_atlas_login", "email": "dev.pessoa@empresa.com" },
  { "cargo": "Especialista", "area": "Desenvolvimento", "login_atlas": "esp_atlas_login", "email": "especialista.dev@empresa.com" },
  { "cargo": "Gerente de Gente e Gestão", "area": "Gente e Gestão", "login_atlas": "geng_atlas_login", "email": "gerente.rh@empresa.com" },
  { "cargo": "Especialista em Pessoas e Culturas", "area": "Gente e Gestão", "login_atlas": "pcul_atlas_login", "email": "cultura.rh@empresa.com" },
  { "cargo": "Especialista em Pessoas e Desenvolvimento", "area": "Gente e Gestão", "login_atlas": "pdev_atlas_login", "email": "desenvolvimento.rh@empresa.com" },
  { "cargo": "Especialista em Pessoas e Financeiro", "area": "Gente e Gestão", "login_atlas": "pfin_atlas_login", "email": "financeiro.rh@empresa.com" },
  { "cargo": "Especialista em Pessoas e Dados", "area": "Gente e Gestão", "login_atlas": "pdat_atlas_login", "email": "dados.rh@empresa.com" }
];

function getEmailByCargo(cargoName) {
  const user = userRolesData.find(item => item.cargo === cargoName);
  return user ? user.email : null;
}

function getEmailsByArea(areaName) {
  return userRolesData
    .filter(item => item.area === areaName)
    .map(item => item.email);
}

function runTests() {
  console.log("--- Teste de Busca de E-mails ---");

  const cargo1 = "Gerente de Comercial";
  console.log(`\n1. E-mail do ${cargo1}:`);
  console.log(getEmailByCargo(cargo1));

  const cargo2 = "Diretor(a) Executivo(a) Principal (CEO)";
  console.log(`\n2. E-mail do ${cargo2}:`);
  console.log(getEmailByCargo(cargo2));

  const area3 = "Desenvolvimento";
  console.log(`\n3. E-mails da Área de ${area3}:`);
  console.log(getEmailsByArea(area3));

  const cargo4 = "Estagiário de Teste";
  console.log(`\n4. E-mail de um cargo inexistente:`);
  console.log(getEmailByCargo(cargo4));
}

runTests();
