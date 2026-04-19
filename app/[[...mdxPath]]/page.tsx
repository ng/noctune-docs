import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from 'nextra-theme-docs'
import { AIDraft } from '../../components/ai-draft'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props: PageProps) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath)
  return metadata
}

type PageProps = {
  params: Promise<{ mdxPath?: string[] }>
}

export default async function Page(props: PageProps) {
  const params = await props.params
  const result = await importPage(params.mdxPath)
  const { default: MDXContent, ...rest } = result
  const aiDrafted = (rest.metadata as { aiDrafted?: boolean }).aiDrafted === true
  const Wrapper = getMDXComponents().wrapper
  const content = (
    <>
      {aiDrafted && <AIDraft />}
      <MDXContent {...props} params={params} />
    </>
  )
  return Wrapper ? <Wrapper {...rest}>{content}</Wrapper> : content
}
