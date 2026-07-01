import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    text = []
    with zipfile.ZipFile(path) as docx:
        tree = ET.parse(docx.open('word/document.xml'))
        root = tree.getroot()
        for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            para_text = []
            for run in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                if run.text:
                    para_text.append(run.text)
            text.append("".join(para_text))
    return "\n".join(text)

try:
    text = get_docx_text(r"d:\mart\baldia-mart\tmp_docs\Baldia_Mart_Financial_SRS_v3.docx")
    with open(r"d:\mart\baldia-mart\tmp_docs\financial_srs_text.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("SUCCESS: Baldia_Mart_Financial_SRS_v3.docx extracted.")
except Exception as e:
    print("ERROR v3:", e)

try:
    text = get_docx_text(r"d:\mart\baldia-mart\tmp_docs\Baldia_Mart_Financial_Documentation.docx")
    with open(r"d:\mart\baldia-mart\tmp_docs\financial_documentation_text.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("SUCCESS: Baldia_Mart_Financial_Documentation.docx extracted.")
except Exception as e:
    print("ERROR doc:", e)
