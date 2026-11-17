from playwright.sync_api import sync_playwright
import json
from pathlib import Path
root=Path('/mnt/data/Calcolo_Cilindri_v6_Gemini_Studenti')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1500,'height':960},device_scale_factor=1)
    errors=[]; sent=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="styles.css">','<style>'+(root/'styles.css').read_text()+'</style>')
    for f in ['model.js','app.js','ai_schema.js','ai_assistant.js']:
        html=html.replace('<script src="js/'+f+'"></script>','')
    page.set_content(html, wait_until='domcontentloaded')
    page.evaluate("""window.fetch = async (url,opts) => {
      if(String(url).includes('/api/assistant/status')) return {ok:true,json:async()=>({available:true,requiresPersonalKey:true,accessCodeRequired:false,model:'gemini-3-flash-preview'})};
      const data=JSON.parse(opts.body);
      const first=data.message.startsWith('Progetto cilindro');
      const updates=first?{bore:80,rod:25,stroke:600,mass:100}:{pressure:6,frequency:12,temperature:30,dailyHours:16,annualDays:230,elasticModulus:210000,lengthFactor:2,safetyFactor:5,loadMode:'theoretical',velocityMode:'calculated'};
      return {ok:true,json:async()=>({updates,issues:[],notes:'',usage:{}})};
    }; undefined""")
    for f in ['model.js','app.js','ai_schema.js','ai_assistant.js']:
        page.add_script_tag(content=(root/'js'/f).read_text())
    assert page.locator('#ai-open-button').is_visible()
    page.click('#ai-open-button')
    page.locator('#ai-dialog').wait_for(state='visible')
    assert '0 / 14' in page.locator('#ai-progress-text').inner_text()
    assert page.locator('#ai-api-key').is_visible()
    assert not page.locator('#ai-send-button').is_enabled()
    page.locator('#ai-api-key').fill('AIza1234567890TestStudentAPIKey123456789')
    assert page.locator('#ai-send-button').is_enabled()
    def intercept(route):
        request=route.request.post_data_json
        sent.append(request)
        assert request['apiKey']=='AIza1234567890TestStudentAPIKey123456789'
        msg=request['message']
        if msg.startswith('Progetto cilindro'):
            fields={'bore':80,'rod':25,'stroke':600,'mass':100}
        else:
            fields={'pressure':6,'frequency':12,'temperature':30,'dailyHours':16,'annualDays':230,'elasticModulus':210000,'lengthFactor':2,'safetyFactor':5,'loadMode':'theoretical','velocityMode':'calculated'}
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'updates':fields,'issues':[],'notes':'','usage':{}}))
    # page mocks network through an in-memory fetch stub; server tests verify HTTP credentials
    page.screenshot(path=str(root/'ANTEPRIMA_v6_CHIAVI_PERSONALI.png'),full_page=False)
    page.locator('#ai-input').fill('Progetto cilindro, alesaggio 80 mm, stelo 25 mm, corsa 600 mm e massa esterna 100 kg.')
    page.click('#ai-send-button')
    assert '4 / 14' in page.locator('#ai-progress-text').inner_text()
    page.screenshot(path=str(root/'ANTEPRIMA_v6_DIALOGO.png'),full_page=False)
    page.locator('#ai-input').fill('Pressione 6 bar, 12 cicli/min, T 30 C, 16 ore/g, 230 giorni/anno, modulo 210000 N/mm2, fattore k=2, sicurezza 5, confronta spinta teorica, velocita calcolata.')
    page.click('#ai-send-button')
    assert '14 / 14' in page.locator('#ai-progress-text').inner_text()
    assert page.locator('#ai-apply-button').is_enabled()
    page.click('#ai-apply-button')
    assert not page.locator('#ai-dialog').is_visible()
    assert page.locator('#bore').input_value()=='80'
    assert page.locator('#stroke').input_value()=='600'
    assert page.locator('#pressure').input_value()=='6'
    assert page.locator('#mass').input_value()=='100'
    assert not errors, errors
    assert len(sent)==0
    print('BROWSER QA OK: personal key field, HTTP payload, staged extraction, all 14 values, calculator transfer, no JS errors')
    browser.close()
