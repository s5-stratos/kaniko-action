import { Scanner } from '../src/kvarg.js'

const onErrorThrow = (msg: string) => {
    throw new Error(msg);
}

test('simple scan', () => {
    const result = new Scanner('npmrc=ABCDEFabc', onErrorThrow).readKVs();
    expect(result).toStrictEqual([['npmrc', 'ABCDEFabc']]);
})

test('multiline scan', () => {
    const result = new Scanner('npmrc=ABC\npackage-lock.json=...', onErrorThrow).readKVs();
    expect(result).toStrictEqual([
        ['npmrc', 'ABC'],
        ['package-lock.json', '...']
    ]);
})

test('test quoted', () => {
    const input = `"npmrc=registry=https://somewhere
//more/places==
"
extra=1`
    const result = new Scanner(input, onErrorThrow).readKVs();
    expect(result).toStrictEqual([
        ['npmrc', `registry=https://somewhere
//more/places==
`],
        ['extra', '1']
    ])
})

// Make sure multiline strings work correctly as the only kv
test('test quoted single', () => {
    const input = `"npmrc=registry=https://somewhere
//more/places==
"`
    const result = new Scanner(input, onErrorThrow).readKVs();
    expect(result).toStrictEqual([
        ['npmrc', `registry=https://somewhere
//more/places==
`]
    ])
})

