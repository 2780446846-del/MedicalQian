import pathlib

root = pathlib.Path(r'd:/ZM/Qian/MedicalQian/my-uniapp-project/static/tabbar')
mapping = {
    '首页.png': 'home.png',
    '首页-选中.png': 'home-active.png',
    '名医.png': 'doctor.png',
    '名医-选中.png': 'doctor-active.png',
    '买药.png': 'medicine.png',
    '买药-选中.png': 'medicine-active.png',
    '医说.png': 'yishuo.png',
    '医说-选中.png': 'yishuo-active.png',
    '我的.png': 'mine.png',
    '我的-选中.png': 'mine-active.png',
}

for cn, en in mapping.items():
    src = root / cn
    if src.exists():
        dst = root / en
        print(f"Renaming {cn} -> {en}")
        src.rename(dst)
    else:
        print(f"Skip {cn}, not found")

print('Done')
